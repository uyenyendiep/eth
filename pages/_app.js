import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { Global, css } from '@emotion/react';
const theme = extendTheme();

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider resetCSS theme={theme}>
      <Component {...pageProps} />
      <Global
        styles={css`
          body {
            background-color: #f7fafc;
          }

          #__next {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            max-width: 600px;
            margin: 0 auto;
            padding: 10px;
          }
        `}
      />
    </ChakraProvider>
  );
}

export default MyApp;
