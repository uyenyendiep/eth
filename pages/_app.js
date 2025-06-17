// pages/_app.js
import { ChakraProvider, extendTheme, Box } from '@chakra-ui/react';
import { Global, css } from '@emotion/react';
import NavigationBar from '../components/NavigationBar';

const theme = extendTheme();

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider resetCSS theme={theme}>
      <NavigationBar />
      <Box pt={{ base: '50px', sm: '60px' }}>
        <Component {...pageProps} />
      </Box>
      <Global
        styles={css`
          body {
            background-color: #f7fafc;
          }

          #__next {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }

          #__next > div:last-child {
            flex: 1;
            max-width: 800px;
            margin: 0 auto;
            padding: 10px;
            width: 100%;
          }

          @media (max-width: 640px) {
            #__next > div:last-child {
              padding: 5px;
            }
          }
        `}
      />
    </ChakraProvider>
  );
}

export default MyApp;
