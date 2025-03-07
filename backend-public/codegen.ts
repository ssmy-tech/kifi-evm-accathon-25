import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/schema.gql',
  documents: ['./src/graphql/**/*.ts'],
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
    '../frontend/src/generated/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
        fragmentMasking: false
      },
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
        'typescript-react-query'
      ],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
        withMutationFn: true,
        withRefetchFn: true,
        reactApolloVersion: 3,
        pureMagicComment: true,
        exposeFetcher: true,
        exposeQueryKeys: true,
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