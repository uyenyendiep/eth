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
import { FaMapMarkerAlt, FaCamera } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Import ModelCard component từ models page
const ModelCard = ({ model }) => {
  const primaryUsername = model.usernames.find((u) => u.isPrimary)?.username;
  const allUsernames = model.usernames.map((u) => u.username).join(' / ');
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
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Lấy query từ URL khi ở client-side
    if (router.isReady) {
      setQuery(router.query.query || '');
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!query) {
      setLoading(false);
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

        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching models:', error);
      } finally {
        setLoading(false);
      }
    };

    searchModels();
  }, [query]);

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="lg" color="blue.500" />
      </Center>
    );
  }

  return (
    <Box>
      <VStack spacing={4} mb={6}>
        <Heading size="lg">Search Results</Heading>
        <Text color="gray.600">
          "{query}" - {searchResults.length} models found
        </Text>
      </VStack>

      {searchResults.length === 0 ? (
        <Center py={8}>
          <VStack spacing={2}>
            <Text fontSize="lg" color="gray.500">
              No models found
            </Text>
            <Text fontSize="sm" color="gray.400">
              Try searching with a different keyword
            </Text>
          </VStack>
        </Center>
      ) : (
        <List>
          {searchResults.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </List>
      )}
    </Box>
  );
}
