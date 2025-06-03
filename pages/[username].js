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
      width="100%"
      maxW="600px"
      minW="600px"
      mx="auto"
    >
      <Link href={`/${username}/post/${post.id}`} passHref>
        <Stack as={ChakraLink} spacing={0}>
          <Box borderRadius={4} overflow="hidden">
            <CombinedThumbnail media={post.media} modelName={post.model.name} />
          </Box>

          <Flex p={3} align="center" justify="space-between">
            {/* Avatar */}
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
            {/* Tên model và usernames */}
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
                  {post.model.usernames.map((u) => u.username).join(' / ')}
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

    return {
      props: {
        model: modelData.model,
        initialPosts: postsData.posts,
        totalPages: postsData.totalPages,
        username: params.username
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
  username
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

  const allUsernames = model.usernames.map((u) => u.username).join(' / ');

  return (
    <Box maxW="600px" mx="auto">
      {/* Model Header */}
      <VStack spacing={4} p={4} bg="white" borderRadius="lg" mb={4}>
        <Avatar src={model.avatarUrl} name={model.name} size="2xl" />
        <VStack spacing={1}>
          <Heading size="lg">{model.name}</Heading>
          <Text color="gray.600" fontSize="sm">
            {allUsernames}
          </Text>
          {model.location && (
            <HStack color="gray.500" fontSize="sm">
              <Icon as={FaMapMarkerAlt} />
              <Text>{model.location}</Text>
            </HStack>
          )}
        </VStack>

        <HStack spacing={6} pt={2}>
          <VStack spacing={0}>
            <Text fontWeight="bold" fontSize="xl">
              {model._count?.posts || 0}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Posts
            </Text>
          </VStack>
        </HStack>
      </VStack>

      {/* <Divider mb={4} /> */}

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
          <Text color="gray.500">That's all for now.</Text>
        </Center>
      )}

      {displayedPosts.length === 0 && (
        <Center py={8}>
          <Text color="gray.500">Chưa có bài viết nào</Text>
        </Center>
      )}
    </Box>
  );
}
