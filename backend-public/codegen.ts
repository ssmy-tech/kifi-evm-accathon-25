import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/schema.gql',
  documents: ['./src/graphql/queries.ts'],  // Only read from queries.ts since telegram.operations.ts re-exports
  generates: {
    // Backend types
    './src/types/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context#Context',
        useIndexSignature: true,
        enumsAsTypes: true,
        skipTypename: true,
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
        scalars: {
          DateTime: 'Date',
        },
      },
    },
    // Frontend SDK with types and hooks
    '../frontend/src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo'
      ],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
        withMutationFn: true,
        withRefetchFn: true,
        reactApolloVersion: 3,
        pureMagicComment: true,
        dedupeFragments: true,
        scalars: {
          DateTime: 'string',
        },
      },
    },
    // Generate a schema.graphql file for the frontend
    '../frontend/src/generated/schema.graphql': {
      plugins: ['schema-ast']
    }
  },
  ignoreNoDocuments: true,
};

export default config; 