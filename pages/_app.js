// pages/_app.js
import { ChakraProvider, extendTheme, Box } from '@chakra-ui/react';
import { Global, css } from '@emotion/react';
import { DefaultSeo } from 'next-seo';
import NavigationBar from '../components/NavigationBar';

const theme = extendTheme();

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider resetCSS theme={theme}>
      <DefaultSeo
        title="eTHOT - Exclusive Model Content Leaks"
        description="Exclusive leaked photos and videos collection. Browse the latest image leaks and video leaks from top models."
        openGraph={{
          type: 'website',
          locale: 'en_US',
          url: 'https://ethot.me/',
          site_name: 'eTHOT',
          images: [
            {
              url: 'https://ethot.me/og-image.jpg',
              width: 1200,
              height: 630,
              alt: 'eTHOT - Model Content Leaks'
            }
          ]
        }}
        twitter={{
          handle: '@ethot',
          site: '@ethot',
          cardType: 'summary_large_image'
        }}
        additionalMetaTags={[
          {
            name: 'keywords',
            content:
              'model leaks, image leaks, video leaks, exclusive content, leaked photos, leaked videos, free downloads, uncensored content, NSFW, premium content, fappening, ethot, get link, free download'
          }
        ]}
      />
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
