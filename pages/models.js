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
  Badge,
  Image
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

const MODELS_PER_PAGE = 10;

const ModelCard = ({ model }) => {
  const primaryUsername = model.usernames.find((u) => u.isPrimary)?.username;
  const allUsernames = model.usernames
    .filter((u) => !u.username.includes('-'))
    .map((u) => u.username)
    .join(' / ');

  // Ưu tiên avatarGifUrl, nếu không có thì dùng avatarUrl
  const displayAvatar = model.avatarGifUrl || model.avatarUrl;

  return (
    <ListItem
      border="1px solid"
      borderColor="gray.200"
      borderRadius={8}
      my={4}
      bg="white"
      width="100%"
      maxW="800px"
      mx="auto"
      overflow="hidden"
      // transition="all 0.2s"
      // _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
    >
      <Link href={`/${primaryUsername}`} passHref>
        <Box
          as={ChakraLink}
          display="block"
          _hover={{ textDecoration: 'none' }}
        >
          {/* Avatar Image 800x800 */}
          <Box
            width="100%"
            height={{ base: '100vw', sm: '800px' }}
            maxH="800px"
            position="relative"
            bg="gray.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Image
              src={displayAvatar}
              alt={model.name}
              width="100%"
              height="100%"
              objectFit="cover"
            />
          </Box>

          {/* White Banner with Name and Username */}
          <Box bg="white" p={4} borderTop="1px" borderColor="gray.100">
            <VStack spacing={1} align="center">
              <Text fontSize="xl" fontWeight="bold" color="gray.800">
                {model.name}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {allUsernames}
              </Text>

              {/* Location if exists */}
              {model.location && (
                <HStack color="gray.500" fontSize="sm" mt={1}>
                  <Icon as={FaMapMarkerAlt} boxSize={3} />
                  <Text>{model.location}</Text>
                </HStack>
              )}
            </VStack>
          </Box>
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
    <Box paddingTop="20px">
      <Center mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Top Models
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
          <Text color="gray.500">That's all for now!</Text>
        </Center>
      )}
    </Box>
  );
}
