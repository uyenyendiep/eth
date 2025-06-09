// pages/models.js
import {
  Box,
  Avatar,
  Text,
  Stack,
  List,
  ListItem,
  ChakraLink,
  HStack,
  Icon,
  Center,
  Spinner,
  VStack,
  Badge
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaMapMarkerAlt, FaCamera } from 'react-icons/fa';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

const MODELS_PER_PAGE = 10;

const ModelCard = ({ model }) => {
  const primaryUsername = model.usernames.find((u) => u.isPrimary)?.username;
  const allUsernames = model.usernames.map((u) => u.username).join(' / ');

  return (
    <ListItem
      border="1px solid"
      borderColor="gray.200"
      borderRadius={8}
      my={4}
      bg="white"
      width="100%"
      maxW="600px"
      mx="auto"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
    >
      <Link href={`/${primaryUsername}`} passHref>
        <Box
          as={ChakraLink}
          display="block"
          _hover={{ textDecoration: 'none' }}
        >
          {/* Cover Image Area */}
          <Box
            height="400px"
            position="relative"
            bg="gray.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Avatar
              src={model.avatarUrl}
              name={model.name}
              size="full"
              width="100%"
              height="100%"
              borderRadius={0}
              objectFit="cover"
            />

            {/* Overlay gradient */}
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              height="150px"
              bgGradient="linear(to-t, blackAlpha.700, transparent)"
            />

            {/* Model info overlay */}
            <VStack
              position="absolute"
              bottom={4}
              left={4}
              right={4}
              align="start"
              spacing={2}
              color="white"
            >
              <Text
                fontSize="2xl"
                fontWeight="bold"
                textShadow="0 2px 4px rgba(0,0,0,0.8)"
              >
                {model.name}
              </Text>
              <Text
                fontSize="sm"
                opacity={0.9}
                textShadow="0 1px 2px rgba(0,0,0,0.8)"
              >
                {allUsernames}
              </Text>
            </VStack>
          </Box>

          {/* Bottom Info Section */}
          <HStack p={4} justify="space-between" align="center">
            <HStack spacing={4}>
              {model.location && (
                <HStack color="gray.600" fontSize="sm">
                  <Icon as={FaMapMarkerAlt} />
                  <Text>{model.location}</Text>
                </HStack>
              )}
            </HStack>

            <HStack spacing={2}>
              <Icon as={FaCamera} color="gray.600" />
              <Text fontWeight="bold" color="gray.700">
                {model._count?.posts || 0}
              </Text>
              <Text fontSize="sm" color="gray.600">
                posts
              </Text>
            </HStack>
          </HStack>
        </Box>
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
      'models-page-1.json'
    );
    const metaPath = path.join(
      process.cwd(),
      'public',
      'data',
      'models-meta.json'
    );

    const initialData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    return {
      props: {
        initialModels: initialData.models,
        totalPages: metadata.totalPages
      }
    };
  } catch (error) {
    console.error('Error loading initial data:', error);
    return {
      props: {
        initialModels: [],
        totalPages: 0
      }
    };
  }
}

export default function ModelsPage({ initialModels, totalPages }) {
  const [displayedModels, setDisplayedModels] = useState(initialModels);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(currentPage < totalPages);
  const [isRestoring, setIsRestoring] = useState(true);
  const loadingRef = useRef(false);

  const { restoreScrollState } = useScrollRestoration(
    displayedModels,
    currentPage
  );

  // Restore state on mount
  useEffect(() => {
    const restored = restoreScrollState();
    if (restored) {
      setDisplayedModels(restored.savedPosts); // reuse same key
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

  const loadMoreModels = useCallback(async () => {
    if (loadingRef.current || !hasMore || isRestoring) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const nextPage = currentPage + 1;
      const response = await fetch(`/data/models-page-${nextPage}.json`);

      if (!response.ok) throw new Error('Failed to load models');

      const data = await response.json();

      if (data.models && data.models.length > 0) {
        setDisplayedModels((prev) => [...prev, ...data.models]);
        setCurrentPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error loading models:', error);
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
        loadMoreModels();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreModels, isRestoring]);

  return (
    <Box>
      <Center mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          All Models ({displayedModels.length})
        </Text>
      </Center>

      <List>
        {displayedModels.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </List>

      {loading && (
        <Center py={4}>
          <Spinner size="lg" color="blue.500" />
        </Center>
      )}

      {!hasMore && displayedModels.length > 0 && (
        <Center py={4}>
          <Text color="gray.500">That all for now!</Text>
        </Center>
      )}
    </Box>
  );
}
