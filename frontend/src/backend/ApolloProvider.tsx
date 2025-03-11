import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { usePrivy } from "@privy-io/react-auth";
import { useMemo, useEffect, useState } from "react";

const httpLink = createHttpLink({
	uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
});

const ApolloProviderWrapper = ({ children }: { children: React.ReactNode }) => {
	const { ready, authenticated, getAccessToken } = usePrivy();
	const [token, setToken] = useState<string | null>(null);

	useEffect(() => {
		async function updateToken() {
			if (!ready) return;

			if (authenticated) {
				const newToken = await getAccessToken();
				console.log("Setting new privy token");
				console.log(newToken);
				setToken(newToken);
			} else {
				console.log("Clearing token - not authenticated");
				setToken(null);
			}
		}

		updateToken();
	}, [ready, authenticated, getAccessToken]);

	const client = useMemo(() => {
		const authLink = setContext(async (_, { headers }) => {
			if (!ready) {
				return { headers };
			}

			let currentToken = token;
			if (authenticated && !currentToken) {
				console.log("No privy token in state, fetching new one");
				currentToken = await getAccessToken();
				setToken(currentToken);
			}

			const updatedHeaders = {
				...headers,
				Authorization: `Bearer ${currentToken}`,
			};

			return { headers: updatedHeaders };
		});

		const newClient = new ApolloClient({
			link: authLink.concat(httpLink),
			cache: new InMemoryCache(),
		});
		return newClient;
	}, [ready, authenticated, token, getAccessToken]);

	if (!ready) {
		return null;
	}

	return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default ApolloProviderWrapper;
