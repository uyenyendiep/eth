import {
  Box,
  Text,
  List,
  ListItem,
  Center,
  Heading,
  VStack,
  HStack,
  Avatar,
  Icon,
  ChakraLink,
  Spinner
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaMapMarkerAlt, FaCamera } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Import ModelCard component từ models page
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

            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              height="150px"
              bgGradient="linear(to-t, blackAlpha.700, transparent)"
            />

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
        <Heading size="lg">Kết quả tìm kiếm</Heading>
        <Text color="gray.600">
          "{query}" - Tìm thấy {searchResults.length} models
        </Text>
      </VStack>

      {searchResults.length === 0 ? (
        <Center py={8}>
          <VStack spacing={2}>
            <Text fontSize="lg" color="gray.500">
              Không tìm thấy model nào
            </Text>
            <Text fontSize="sm" color="gray.400">
              Thử tìm kiếm với từ khóa khác
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
