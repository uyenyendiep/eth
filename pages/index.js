import {
  Flex,
  Image,
  List,
  ListItem,
  Stack,
  ChakraLink,
  Text,
  Box,
  HStack,
  Icon,
  Center,
  Spinner
} from '@chakra-ui/react';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import { FaImage, FaVideo } from 'react-icons/fa';
import { useState, useEffect, useCallback, useRef } from 'react';
import CombinedThumbnail from '../components/CombinedThumbnail';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

const POSTS_PER_PAGE = 10;

const Post = ({ id, thumbnailUrl, downloadUrl, model, media, postCount }) => {
  const primaryUsername = model.usernames.find((u) => u.isPrimary)?.username;

  const imageCount =
    media && Array.isArray(media)
      ? media.filter((m) => m.type === 'IMAGE' || m.type === 'GIF').length
      : 0;
  const videoCount =
    media && Array.isArray(media)
      ? media.filter((m) => m.type === 'VIDEO').length
      : 0;

  return (
    <ListItem
      border="1px solid"
      borderColor="gray.200"
      borderRadius={4}
      my={4}
      bg="white"
      key={id}
      width={{ base: '100%', lg: '800px' }}
      maxW="800px"
      mx="auto"
    >
      <Link href={`/${primaryUsername}/post/${postCount}`} passHref>
        <Stack as={ChakraLink} spacing={0}>
          <Box borderTopRadius={4} overflow="hidden">
            <CombinedThumbnail
              media={media}
              modelName={model.name}
              showPlayIcon={true}
            />
          </Box>

          <Flex p={3} align="center">
            <Link href={`/${primaryUsername}`} passHref legacyBehavior>
              <Image
                src={model.avatarUrl}
                alt={model.name}
                boxSize="48px"
                borderRadius="full"
                objectFit="cover"
                mr={3}
              />
            </Link>

            <Stack spacing={0} flex={1}>
              <Link href={`/${primaryUsername}`} passHref legacyBehavior>
                <Text fontWeight="bold" width="fit-content" display="inline">
                  {model.name}
                </Text>
              </Link>
              <Link href={`/${primaryUsername}`} passHref legacyBehavior>
                <Text
                  fontSize="sm"
                  color="gray.500"
                  width="fit-content"
                  display="inline"
                >
                  {model.usernames
                    .filter((u) => !u.username.includes('-'))
                    .map((u) => u.username)
                    .join(' / ')}
                </Text>
              </Link>
            </Stack>

            <HStack spacing={3} ml={3}>
              {imageCount > 0 && (
                <HStack spacing={1}>
                  <Icon as={FaImage} color="gray.600" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">
                    {imageCount}
                  </Text>
                </HStack>
              )}
              {videoCount > 0 && (
                <HStack spacing={1}>
                  <Icon as={FaVideo} color="gray.600" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">
                    {videoCount}
                  </Text>
                </HStack>
              )}
            </HStack>
          </Flex>
        </Stack>
      </Link>
    </ListItem>
  );
};

export async function getStaticProps() {
  const fs = require('fs');
  const path = require('path');

  try {
    const dataPath = path.join(
      process.cwd(),
      'public',
      'data',
      'posts-page-1.json'
    );
    const metaPath = path.join(
      process.cwd(),
      'public',
      'data',
      'posts-meta.json'
    );

    const initialData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    return {
      props: {
        initialPosts: initialData.posts,
        totalPages: metadata.totalPages
      }
    };
  } catch (error) {
    console.error('Error loading initial data:', error);
    return {
      props: {
        initialPosts: [],
        totalPages: 0
      }
    };
  }
}

export default function HomePage({ initialPosts, totalPages }) {
  const [displayedPosts, setDisplayedPosts] = useState(initialPosts);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(currentPage < totalPages);
  const [isRestoring, setIsRestoring] = useState(true);
  const loadingRef = useRef(false);

  const { restoreScrollState } = useScrollRestoration(
    displayedPosts,
    currentPage
  );

  // Restore state on mount
  useEffect(() => {
    const restored = restoreScrollState();
    if (restored) {
      setDisplayedPosts(restored.savedPosts);
      setCurrentPage(restored.savedPage);
      setHasMore(restored.savedPage < totalPages);

      // Restore scroll position after render
      setTimeout(() => {
        window.scrollTo(0, restored.scrollY);
        setIsRestoring(false);
      }, 100);
    } else {
      setIsRestoring(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (loadingRef.current || !hasMore || isRestoring) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const nextPage = currentPage + 1;
      const response = await fetch(`/data/posts-page-${nextPage}.json`);

      if (!response.ok) throw new Error('Failed to load posts');

      const data = await response.json();

      if (data.posts && data.posts.length > 0) {
        setDisplayedPosts((prev) => [...prev, ...data.posts]);
        setCurrentPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentPage, hasMore, isRestoring]);

  useEffect(() => {
    if (isRestoring) return;

    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts, isRestoring]);

  return (
    <>
      <NextSeo
        title="Latest Model Leaks - Image & Video Leaks | eTHOT"
        description="Browse the latest leaked content from top models. Exclusive image leaks and video leaks updated daily. High quality photo and video collection."
        canonical="https://ethot.me/"
        additionalMetaTags={[
          {
            name: 'keywords',
            content:
              'latest leaks, new model leaks, today leaks, fresh content, exclusive leaks, daily updates'
          }
        ]}
      />
      <List>
        {displayedPosts.map((post) => (
          <Post key={post.id} {...post} />
        ))}
      </List>

      {loading && (
        <Center py={4}>
          <Spinner size="lg" color="blue.500" />
        </Center>
      )}

      {!hasMore && displayedPosts.length > 0 && (
        <Center py={4}>
          <Text color="gray.500">You have reached the end</Text>
        </Center>
      )}
    </>
  );
}
