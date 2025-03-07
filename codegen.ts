import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/schema.gql',
  documents: ['src/**/*.ts'],
  generates: {
    './src/types/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers', 'typescript-operations'],
      config: {
        contextType: './context#Context',
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
  },
  ignoreNoDocuments: true,
};

export default config; 