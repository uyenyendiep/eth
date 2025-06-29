// pages/[username].js
import {
  Box,
  Avatar,
  Heading,
  Text,
  Stack,
  List,
  ListItem,
  ChakraLink,
  Flex,
  HStack,
  Icon,
  Center,
  Spinner,
  VStack,
  Image,
  Divider
} from '@chakra-ui/react';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import { generateSEOTitle, generateSEODescription } from '../config/seo.config';
import { FaImage, FaVideo, FaMapMarkerAlt } from 'react-icons/fa';
import { useState, useEffect, useCallback, useRef } from 'react';
import CombinedThumbnail from '../components/CombinedThumbnail';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

const POSTS_PER_PAGE = 10;

const ModelPost = ({ post, username }) => {
  const imageCount = post.media.filter(
    (m) => m.type === 'IMAGE' || m.type === 'GIF'
  ).length;
  const videoCount = post.media.filter((m) => m.type === 'VIDEO').length;

  return (
    <ListItem
      border="1px solid"
      borderColor="gray.200"
      borderRadius={4}
      my={4}
      bg="white"
      width={{ base: '100%', lg: '800px' }}
      maxW="800px"
      mx="auto"
    >
      <Link href={`/${username}/post/${post.postCount}`} passHref>
        <Stack as={ChakraLink} spacing={0}>
          <Box borderRadius={4} overflow="hidden">
            <CombinedThumbnail
              media={post.media}
              modelName={post.model.name}
              showPlayIcon={true}
            />
          </Box>

          <Flex p={3} align="center" justify="space-between">
            <Link href={`/${username}`} passHref legacyBehavior>
              <Image
                src={post.model.avatarUrl}
                alt={post.model.name}
                boxSize="48px"
                borderRadius="full"
                objectFit="cover"
                mr={3}
              />
            </Link>

            <Stack spacing={0} flex={1}>
              <Link href={`/${username}`} passHref legacyBehavior>
                <Text fontWeight="bold" width="fit-content" display="inline">
                  {post.model.name}
                </Text>
              </Link>

              <Link href={`/${username}`} passHref legacyBehavior>
                <Text
                  fontSize="sm"
                  color="gray.500"
                  width="fit-content"
                  display="inline"
                >
                  {post.model.usernames
                    .filter((u) => !u.username.includes('-'))
                    .map((u) => u.username)
                    .join(' / ')}
                </Text>
              </Link>
            </Stack>

            <HStack spacing={3}>
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

export async function getStaticPaths() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const models = await prisma.model.findMany({
    include: {
      usernames: true
    }
  });

  const paths = models
    .map((model) => {
      const primaryUsername = model.usernames.find((u) => u.isPrimary);
      if (!primaryUsername) return null;

      return {
        params: {
          username: primaryUsername.username
        }
      };
    })
    .filter(Boolean);

  await prisma.$disconnect();

  return {
    paths,
    fallback: false
  };
}

export async function getStaticProps({ params }) {
  const fs = require('fs');
  const path = require('path');

  try {
    // Load model data
    const modelDataPath = path.join(
      process.cwd(),
      'public',
      'data',
      'models',
      `${params.username}.json`
    );
    const modelData = JSON.parse(fs.readFileSync(modelDataPath, 'utf8'));

    // Load first page of posts
    const postsDataPath = path.join(
      process.cwd(),
      'public',
      'data',
      'models',
      params.username,
      'posts-page-1.json'
    );
    const postsData = JSON.parse(fs.readFileSync(postsDataPath, 'utf8'));
    let totalImages = 0;
    let totalVideos = 0;

    const allPostsForCounting = [];
    for (let page = 1; page <= postsData.totalPages; page++) {
      const pageDataPath = path.join(
        process.cwd(),
        'public',
        'data',
        'models',
        params.username,
        `posts-page-${page}.json`
      );

      try {
        const pageData = JSON.parse(fs.readFileSync(pageDataPath, 'utf8'));
        allPostsForCounting.push(...pageData.posts);
      } catch (error) {
        console.log(`Could not load page ${page}`);
      }
    }

    // Đếm media từ tất cả posts
    allPostsForCounting.forEach((post) => {
      if (post.media && Array.isArray(post.media)) {
        post.media.forEach((media) => {
          if (media.type === 'IMAGE' || media.type === 'GIF') {
            totalImages++;
          } else if (media.type === 'VIDEO') {
            totalVideos++;
          }
        });
      }
    });

    return {
      props: {
        model: modelData.model,
        initialPosts: postsData.posts,
        totalPages: postsData.totalPages,
        username: params.username,
        totalImages,
        totalVideos
      }
    };
  } catch (error) {
    console.error('Error loading model data:', error);
    return {
      props: {
        model: null,
        initialPosts: [],
        totalPages: 0,
        username: params.username
      }
    };
  }
}

export default function ModelDetailPage({
  model,
  initialPosts,
  totalPages,
  username,
  totalImages,
  totalVideos
}) {
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
      const response = await fetch(
        `/data/models/${username}/posts-page-${nextPage}.json`
      );

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
  }, [currentPage, hasMore, isRestoring, username]);

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

  if (!model) {
    return (
      <Center h="100vh">
        <Text>Model not found</Text>
      </Center>
    );
  }

  const allUsernames = model.usernames
    .filter((u) => !u.username.includes('-'))
    .map((u) => u.username)
    .join(' / ');

  const seoTitle = generateSEOTitle(model.name);
  const seoDescription = generateSEODescription(
    model.name,
    totalImages,
    totalVideos
  );
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: model.name,
    image: model.avatarUrl,
    url: `https://ethot.me/${username}`,
    description: `${model.name} exclusive leaked content collection`
  };

  return (
    <>
      <NextSeo
        title={seoTitle}
        description={seoDescription}
        canonical={`https://ethot.me/${username}`}
        openGraph={{
          title: seoTitle,
          description: seoDescription,
          images: [
            {
              url: model.avatarUrl,
              width: 800,
              height: 800,
              alt: `${model.name} leak`
            }
          ]
        }}
        additionalMetaTags={[
          {
            name: 'keywords',
            content: `${model.name} leaks, ${model.name} leaked, ${model.name} photos, ${model.name} videos, ${allUsernames} leaks`
          }
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Box maxW="800px" mx="auto" px={{ base: 2, sm: 4 }}>
        {/* Model Header */}
        <VStack
          spacing={{ base: 3, sm: 4 }}
          p={{ base: 3, sm: 4 }}
          bg="white"
          borderRadius="lg"
          mb={4}
          width={{ base: '100%', lg: '800px' }}
          maxW="800px"
        >
          <Avatar
            src={model.avatarUrl}
            name={model.name}
            size={{ base: 'xl', sm: '2xl' }}
          />
          <VStack spacing={1}>
            <Heading size={{ base: 'md', sm: 'lg' }}>{model.name}</Heading>
            <Text
              color="gray.600"
              fontSize={{ base: 'xs', sm: 'sm' }}
              textAlign="center"
              px={2}
            >
              {allUsernames}
            </Text>
            {model.location && (
              <HStack color="gray.500" fontSize={{ base: 'xs', sm: 'sm' }}>
                <Icon as={FaMapMarkerAlt} />
                <Text>{model.location}</Text>
              </HStack>
            )}
          </VStack>

          {/* <HStack spacing={{ base: 4, sm: 6 }} pt={2}>
          <VStack spacing={0}>
            <Text fontWeight="bold" fontSize={{ base: 'lg', sm: 'xl' }}>
              {model._count?.posts || 0}
            </Text>
            <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.600">
              Posts
            </Text>
          </VStack>
        </HStack> */}
          <HStack spacing={{ base: 4, sm: 6 }} pt={2} justify="center">
            {/* Posts count */}
            <VStack spacing={0}>
              <Text fontWeight="bold" fontSize={{ base: 'lg', sm: 'xl' }}>
                {model._count?.posts || 0}
              </Text>
              <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.600">
                Posts
              </Text>
            </VStack>

            {/* Images count */}
            <VStack spacing={0}>
              <Text fontWeight="bold" fontSize={{ base: 'lg', sm: 'xl' }}>
                {totalImages}
              </Text>
              <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.600">
                Images
              </Text>
            </VStack>

            {/* Videos count - chỉ hiển thị nếu > 0 */}
            {totalVideos > 0 && (
              <VStack spacing={0}>
                <Text fontWeight="bold" fontSize={{ base: 'lg', sm: 'xl' }}>
                  {totalVideos}
                </Text>
                <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.600">
                  Videos
                </Text>
              </VStack>
            )}
          </HStack>
        </VStack>

        {/* Posts List */}
        <List>
          {displayedPosts.map((post) => (
            <ModelPost key={post.id} post={post} username={username} />
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

        {displayedPosts.length === 0 && (
          <Center py={8}>
            <Text color="gray.500">Empty</Text>
          </Center>
        )}
      </Box>
    </>
  );
}
