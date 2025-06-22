import {
  Box,
  Text,
  List,
  ListItem,
  Center,
  Heading,
  VStack,
  HStack,
  Icon,
  ChakraLink,
  Spinner,
  Image
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';

const MODELS_PER_PAGE = 10;

// Import ModelCard component từ models page
const ModelCard = ({ model }) => {
  const primaryUsername = model.usernames.find((u) => u.isPrimary)?.username;
  const allUsernames = model.usernames
    .filter((u) => !u.username.includes('-'))
    .map((u) => u.username)
    .join(' / ');
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
    >
      <Link href={`/${primaryUsername}`} passHref>
        <Box
          as={ChakraLink}
          display="block"
          _hover={{ textDecoration: 'none' }}
        >
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

export default function SearchPage() {
  const router = useRouter();
  const [allSearchResults, setAllSearchResults] = useState([]); // Tất cả kết quả tìm kiếm
  const [displayedModels, setDisplayedModels] = useState([]); // Models đang hiển thị
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [isRestoring, setIsRestoring] = useState(true);
  const [queryTooShort, setQueryTooShort] = useState(false);
  const loadingRef = useRef(false);

  const { restoreScrollState } = useScrollRestoration(
    displayedModels,
    currentPage
  );

  // Lấy query từ URL khi ở client-side
  useEffect(() => {
    if (router.isReady) {
      const urlQuery = router.query.query || '';
      setQuery(urlQuery);

      // Kiểm tra độ dài query ngay khi có
      if (urlQuery && urlQuery.trim().length < 3) {
        setQueryTooShort(true);
        setLoading(false);
        setAllSearchResults([]);
        setDisplayedModels([]);
        setHasMore(false);
      } else {
        setQueryTooShort(false);
      }
    }
  }, [router.isReady, router.query]);

  // Restore state on mount
  useEffect(() => {
    // Chỉ restore nếu query hợp lệ
    if (queryTooShort) {
      setIsRestoring(false);
      return;
    }

    const restored = restoreScrollState();
    if (restored) {
      setDisplayedModels(restored.savedPosts);
      setCurrentPage(restored.savedPage);

      // Tính toán lại hasMore dựa trên saved data
      const totalResults = restored.savedPosts.length;
      const expectedTotal = restored.savedPage * MODELS_PER_PAGE;
      setHasMore(totalResults >= expectedTotal);

      setTimeout(() => {
        window.scrollTo(0, restored.scrollY);
        setIsRestoring(false);
      }, 100);
    } else {
      setIsRestoring(false);
    }
  }, [queryTooShort]);

  // Search và load initial data
  useEffect(() => {
    if (!query || isRestoring || queryTooShort) {
      if (!queryTooShort) {
        setLoading(false);
      }
      return;
    }

    const searchModels = async () => {
      setLoading(true);
      try {
        const response = await fetch('/data/all-models.json');
        const data = await response.json();

        const lowerQuery = query.toLowerCase();
        const filtered = data.models.filter((model) => {
          if (model.name.toLowerCase().includes(lowerQuery)) return true;
          return model.usernames.some((u) =>
            u.username.toLowerCase().includes(lowerQuery)
          );
        });

        setAllSearchResults(filtered);

        // Load trang đầu tiên
        const firstPage = filtered.slice(0, MODELS_PER_PAGE);
        setDisplayedModels(firstPage);
        setCurrentPage(1);
        setHasMore(filtered.length > MODELS_PER_PAGE);
      } catch (error) {
        console.error('Error searching models:', error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    searchModels();
  }, [query, isRestoring, queryTooShort]);

  // Load more function
  const loadMoreModels = useCallback(async () => {
    if (loadingRef.current || !hasMore || isRestoring) return;

    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const startIndex = (nextPage - 1) * MODELS_PER_PAGE;
      const endIndex = startIndex + MODELS_PER_PAGE;
      const nextModels = allSearchResults.slice(startIndex, endIndex);

      if (nextModels.length > 0) {
        setDisplayedModels((prev) => [...prev, ...nextModels]);
        setCurrentPage(nextPage);
        setHasMore(endIndex < allSearchResults.length);
      }
    } catch (error) {
      console.error('Error loading more models:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [currentPage, hasMore, isRestoring, allSearchResults]);

  // Scroll event listener
  useEffect(() => {
    if (isRestoring || queryTooShort) return;

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
  }, [loadMoreModels, isRestoring, queryTooShort]);

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="lg" color="blue.500" />
      </Center>
    );
  }

  // Kiểm tra độ dài query - hiển thị thông báo nếu quá ngắn
  if (queryTooShort) {
    return (
      <Box>
        {/* <VStack spacing={4} mb={6} mt={6}>
          <Heading size="lg">Search Results</Heading>
          <Text color="gray.600">"{query}"</Text>
        </VStack> */}
        <Center py={8}>
          <VStack spacing={2}>
            <Text fontSize="lg" color="gray.500">
              Please enter at least 3 characters to search
            </Text>
            <Text fontSize="sm" color="gray.400">
              Try searching with a longer keyword
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box>
      <VStack spacing={4} mb={6} mt={6}>
        <Heading size="lg">Search Results</Heading>
        <Text color="gray.600">{allSearchResults.length} models found</Text>
      </VStack>

      {allSearchResults.length === 0 ? (
        <Center py={8}>
          <Text fontSize="sm" color="gray.400">
            Try searching with a different keyword
          </Text>
        </Center>
      ) : (
        <>
          <List>
            {displayedModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </List>

          {loadingMore && (
            <Center py={4}>
              <Spinner size="lg" color="blue.500" />
            </Center>
          )}

          {!hasMore &&
            displayedModels.length > 0 &&
            displayedModels.length === allSearchResults.length && (
              <Center py={4}>
                <Text color="gray.500">You have reached the end</Text>
              </Center>
            )}
        </>
      )}
    </Box>
  );
}
