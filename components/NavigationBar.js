// components/NavigationBar.js
import {
  Box,
  Flex,
  Text,
  Link as ChakraLink,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  List,
  ListItem,
  Avatar,
  HStack,
  VStack,
  useDisclosure,
  Collapse,
  IconButton,
  useOutsideClick
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function NavigationBar() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const searchRef = useRef();
  const inputRef = useRef();

  // Load all models data on mount
  useEffect(() => {
    fetch('/data/all-models.json')
      .then((res) => res.json())
      .then((data) => {
        setAllModels(data.models || []);
      })
      .catch((err) => console.error('Error loading models:', err));
  }, []);

  // Close search when clicking outside
  useOutsideClick({
    ref: searchRef,
    handler: () => {
      if (isOpen && searchQuery === '') {
        onClose();
      }
    }
  });

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = allModels
      .filter((model) => {
        // Search in model name
        if (model.name.toLowerCase().includes(lowerQuery)) return true;

        // Search in usernames
        return model.usernames.some((u) =>
          u.username.toLowerCase().includes(lowerQuery)
        );
      })
      .slice(0, 10); // Increase limit for full-width dropdown

    setSearchResults(filtered);
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search/${encodeURIComponent(searchQuery.trim())}`);
      handleCloseSearch();
    }
  };

  // Handle Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCloseSearch();
    }
  };

  // Close search and reset state
  const handleCloseSearch = () => {
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle random navigation
  const handleRandom = async () => {
    try {
      const response = await fetch('/data/all-models.json');
      const data = await response.json();

      if (data.models && data.models.length > 0) {
        // Lọc models có posts với validation chặt chẽ
        const modelsWithPosts = data.models.filter(
          (model) =>
            model.postCounts &&
            Array.isArray(model.postCounts) &&
            model.postCounts.length > 0
        );

        if (modelsWithPosts.length === 0) {
          console.log('No models with posts found');
          return;
        }

        // Random một model
        const randomModelIndex = Math.floor(
          Math.random() * modelsWithPosts.length
        );
        const randomModel = modelsWithPosts[randomModelIndex];

        // Tìm primary username
        const primaryUsername = randomModel.usernames.find(
          (u) => u.isPrimary
        )?.username;
        if (!primaryUsername) {
          console.log('No primary username found');
          return;
        }

        // Random một postCount từ danh sách thực tế
        const availablePostCounts = randomModel.postCounts;
        const randomIndex = Math.floor(
          Math.random() * availablePostCounts.length
        );
        const randomPostCount = availablePostCounts[randomIndex];

        // Validation cuối cùng
        if (randomPostCount && primaryUsername) {
          router.push(`/${primaryUsername}/post/${randomPostCount}`);
        }
      }
    } catch (error) {
      console.error('Error getting random post:', error);
    }
  };

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={1000}
      bg="white"
      borderBottom="1px"
      borderColor="gray.200"
      shadow="sm"
      ref={searchRef}
    >
      <Box maxW="1200px" mx="auto" px={4}>
        {!isOpen ? (
          // Normal Navigation Mode
          <Flex
            align="center"
            justify="space-between"
            minH="60px"
            py={0}
            boxSizing="border-box"
          >
            {/* Logo */}
            <Link href="/" passHref legacyBehavior>
              <ChakraLink
                fontSize={{ base: 'lg', md: 'xl' }}
                fontWeight="bold"
                color="blue.600"
                _hover={{ textDecoration: 'none', color: 'blue.700' }}
              >
                ethot.me
              </ChakraLink>
            </Link>

            {/* Navigation Items */}
            <HStack spacing={{ base: 4, md: 6 }} align="center" minH="40px">
              <Link href="/models" passHref legacyBehavior>
                <ChakraLink
                  fontSize="md"
                  _hover={{ textDecoration: 'none', color: 'blue.600' }}
                >
                  Models
                </ChakraLink>
              </Link>

              <ChakraLink
                fontSize="md"
                cursor="pointer"
                onClick={handleRandom}
                _hover={{ textDecoration: 'none', color: 'blue.600' }}
              >
                Random
              </ChakraLink>

              {/* Search Button */}
              <IconButton
                icon={<SearchIcon />}
                variant="ghost"
                onClick={onOpen}
                aria-label="Search"
                size="md"
              />
            </HStack>
          </Flex>
        ) : (
          // Full Search Mode - Fixed height container
          <Flex align="center" h="60px" py={0} boxSizing="border-box">
            <InputGroup flex={1} h="full">
              <InputLeftElement h="full" pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                ref={inputRef}
                placeholder="name or username"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyDown={handleKeyDown}
                h="full"
                fontSize="3xl"
                fontWeight="semibold"
                fontFamily="sans-serif"
                border="none"
                borderRadius="none"
                _focus={{
                  outline: 'none',
                  boxShadow: 'none',
                  caretColor: 'black'
                }}
                _hover={{
                  borderColor: 'transparent'
                }}
                sx={{
                  '&::placeholder': {
                    color: 'gray.500',
                    fontWeight: 'normal'
                  },
                  letterSpacing: '0.5px', // Tăng khoảng cách chữ
                  lineHeight: '1.8' // Tăng line height
                }}
              />
              <InputRightElement h="full" pr={2}>
                <IconButton
                  icon={<CloseIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={handleCloseSearch}
                  aria-label="Close search"
                  color="gray.500"
                  _hover={{ color: 'gray.700', bg: 'gray.100' }}
                />
              </InputRightElement>
            </InputGroup>
          </Flex>
        )}

        {/* Search Results Dropdown - Full Width */}
        {isOpen && searchResults.length > 0 && (
          <Box position="relative" w="full">
            <List
              position="absolute"
              top={0}
              left={0}
              right={0}
              bg="white"
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
              shadow="xl"
              maxH="400px"
              overflowY="auto"
              zIndex={1001}
            >
              {searchResults.map((model) => {
                const primaryUsername = model.usernames.find(
                  (u) => u.isPrimary
                )?.username;
                return (
                  <ListItem
                    key={model.id}
                    p={4}
                    _hover={{ bg: 'gray.50' }}
                    cursor="pointer"
                    borderBottom="1px"
                    borderColor="gray.100"
                    _last={{ borderBottom: 'none' }}
                    onClick={() => {
                      router.push(`/${primaryUsername}`);
                      handleCloseSearch();
                    }}
                  >
                    <HStack spacing={4}>
                      <Avatar
                        src={model.avatarUrl}
                        name={model.name}
                        size="md"
                      />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontSize="md" fontWeight="medium">
                          {model.name}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          @{model.usernames.map((u) => u.username).join(', @')}
                        </Text>
                      </VStack>
                    </HStack>
                  </ListItem>
                );
              })}

              {/* View All Results Footer */}
              <ListItem
                p={4}
                bg="gray.50"
                borderTop="2px"
                borderColor="gray.200"
                textAlign="center"
                cursor="pointer"
                _hover={{ bg: 'gray.100' }}
                onClick={() => {
                  router.push(
                    `/search/${encodeURIComponent(searchQuery.trim())}`
                  );
                  handleCloseSearch();
                }}
              >
                <Text fontSize="md" color="blue.600" fontWeight="medium">
                  Xem tất cả kết quả cho "{searchQuery}" →
                </Text>
              </ListItem>
            </List>
          </Box>
        )}

        {/* Empty State Message */}
        {isOpen && searchQuery.trim() !== '' && searchResults.length === 0 && (
          <Box position="relative" w="full">
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bg="white"
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
              shadow="xl"
              p={8}
              textAlign="center"
              zIndex={1001}
            >
              <Text color="gray.500" fontSize="md">
                Không tìm thấy kết quả cho "{searchQuery}"
              </Text>
              <Text color="gray.400" fontSize="sm" mt={2}>
                Thử tìm kiếm với từ khóa khác
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
