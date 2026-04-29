import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { get } from 'idb-keyval';

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  // Get the token securely from indexedDB instead of localStorage
  const session = await get('rh_session');
  return {
    headers: {
      ...headers,
      authorization: session?.token ? `Bearer ${session.token}` : "",
    }
  }
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});
