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
  const isScrollingRef = useRef(false);

  // Load all models data on mount
  useEffect(() => {
    fetch('/data/all-models.json')
      .then((res) => res.json())
      .then((data) => {
        setAllModels(data.models || []);
      })
      .catch((err) => console.error('Error loading models:', err));
  }, []);

  // Detect scrolling
  useEffect(() => {
    let scrollTimeout;

    const handleScroll = () => {
      isScrollingRef.current = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Close search when clicking outside (but not when scrolling)
  useOutsideClick({
    ref: searchRef,
    handler: () => {
      if (isOpen && searchQuery === '' && !isScrollingRef.current) {
        onClose();
      }
    }
  });

  // Handle open search
  const handleOpenSearch = () => {
    // Save current scroll position
    const scrollY = window.scrollY;

    onOpen();

    // Restore scroll position after state update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Multiple attempts to ensure keyboard opens
      const focusAttempts = [50, 100, 200, 300];
      const timeouts = focusAttempts.map((delay) =>
        setTimeout(() => {
          if (inputRef.current && document.activeElement !== inputRef.current) {
            const scrollY = window.scrollY;

            // Focus with preventScroll to avoid jump
            inputRef.current.focus({ preventScroll: true });

            // Click to trigger keyboard on some mobile browsers
            inputRef.current.click();

            // Maintain scroll position
            if (window.scrollY !== scrollY) {
              window.scrollTo(0, scrollY);
            }
          }
        }, delay)
      );

      return () => timeouts.forEach(clearTimeout);
    }
  }, [isOpen]);

  // Prevent viewport resize when keyboard opens
  useEffect(() => {
    if (!isOpen) return;

    const metaViewport = document.querySelector('meta[name=viewport]');
    const originalContent = metaViewport?.getAttribute('content');

    // Set viewport to prevent resize
    if (metaViewport) {
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
      );
    }

    // Handle visual viewport changes (keyboard open/close)
    const handleViewportChange = () => {
      // Keep input focused when keyboard tries to close
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    };

    // Use visualViewport API if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      // Restore original viewport
      if (metaViewport && originalContent) {
        metaViewport.setAttribute('content', originalContent);
      }

      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          'resize',
          handleViewportChange
        );
        window.visualViewport.removeEventListener(
          'scroll',
          handleViewportChange
        );
      }
    };
  }, [isOpen]);

  // Handle search
  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    // Chỉ search khi có ít nhất 3 ký tự
    if (query.trim().length < 3) {
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
      .slice(0, 10);

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
    if (inputRef.current) {
      inputRef.current.blur();
    }
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle random navigation
  // Handle random navigation
  const handleRandom = async () => {
    try {
      const response = await fetch('/data/all-models.json');
      const data = await response.json();

      if (data.models && data.models.length > 0) {
        // Lấy thông tin post hiện tại từ URL
        const currentPath = router.pathname;
        const currentUsername = router.query.username;
        const currentPostCount = router.query.postCount;

        // Tạo danh sách tất cả posts có thể random
        const allPosts = [];

        data.models.forEach((model) => {
          if (
            model.postCounts &&
            Array.isArray(model.postCounts) &&
            model.postCounts.length > 0
          ) {
            const primaryUsername = model.usernames.find(
              (u) => u.isPrimary
            )?.username;
            if (primaryUsername) {
              model.postCounts.forEach((postCount) => {
                allPosts.push({
                  username: primaryUsername,
                  postCount: postCount
                });
              });
            }
          }
        });

        if (allPosts.length === 0) {
          console.log('No posts found');
          return;
        }

        // Lọc bỏ post hiện tại nếu đang ở trang post detail
        let availablePosts = allPosts;
        if (
          currentPath === '/[username]/post/[postCount]' &&
          currentUsername &&
          currentPostCount
        ) {
          availablePosts = allPosts.filter(
            (post) =>
              !(
                post.username === currentUsername &&
                post.postCount === parseInt(currentPostCount)
              )
          );
        }

        // Nếu chỉ còn 1 post (chính là post hiện tại) thì không làm gì
        if (availablePosts.length === 0) {
          console.log('No other posts available to random');
          return;
        }

        // Random một post từ danh sách available
        const randomIndex = Math.floor(Math.random() * availablePosts.length);
        const randomPost = availablePosts[randomIndex];

        if (randomPost) {
          router.push(`/${randomPost.username}/post/${randomPost.postCount}`);
        }
      }
    } catch (error) {
      console.error('Error getting random post:', error);
    }
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
      bg="white"
      borderBottom="1px"
      borderColor="gray.200"
      shadow="sm"
      ref={searchRef}
    >
      <Box maxW="100%" px={{ base: 2, sm: 4 }}>
        {!isOpen ? (
          // Normal Navigation Mode
          <Flex
            align="center"
            justify="space-between"
            h={{ base: '50px', sm: '60px' }}
            py={0}
            boxSizing="border-box"
          >
            {/* Logo */}
            <Link href="/" passHref legacyBehavior>
              <ChakraLink
                fontSize={{ base: 'md', sm: 'xl', md: '2xl' }}
                fontWeight="bold"
                color="black.600"
                _hover={{ textDecoration: 'none' }}
              >
                eTHOT.
                {/* <Text
                  as="span"
                  fontSize={{ base: 'sm', sm: 'md', md: 'lg' }}
                  fontWeight="hairline"
                  color="red.600"
                  fontStyle="italic"
                >
                  me
                </Text> */}
              </ChakraLink>
            </Link>

            {/* Navigation Items */}
            <HStack spacing={{ base: 4, sm: 6, md: 8 }} align="center">
              <Link href="/models" passHref legacyBehavior>
                <ChakraLink
                  fontSize={{ base: 'sm', sm: 'md' }}
                  _hover={{ textDecoration: 'none' }}
                  fontWeight="light"
                >
                  MODELS
                </ChakraLink>
              </Link>

              <ChakraLink
                fontSize={{ base: 'sm', sm: 'md' }}
                cursor="pointer"
                onClick={handleRandom}
                _hover={{ textDecoration: 'none' }}
                fontWeight="light"
              >
                RANDOM
              </ChakraLink>

              {/* Search Button */}
              <IconButton
                icon={<SearchIcon />}
                variant="ghost"
                onClick={handleOpenSearch}
                aria-label="Search"
                size={{ base: 'sm', sm: 'md' }}
              />
            </HStack>
          </Flex>
        ) : (
          // Full Search Mode
          <Flex
            align="center"
            h={{ base: '50px', sm: '60px' }}
            py={0}
            boxSizing="border-box"
          >
            <InputGroup flex={1} h="full">
              <InputLeftElement h="full" pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                ref={inputRef}
                placeholder="name"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyDown={handleKeyDown}
                h="full"
                fontSize={{ base: 'xl', sm: '2xl', md: '3xl' }}
                fontWeight="semibold"
                fontFamily="sans-serif"
                border="none"
                borderRadius="none"
                autoFocus={true}
                inputMode="text"
                enterKeyHint="search"
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
                  letterSpacing: '0.5px',
                  lineHeight: '1.8',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                  touchAction: 'manipulation'
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

        {/* Search Results Dropdown */}
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
              maxH={{ base: '300px', sm: '400px' }}
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
                    p={{ base: 3, sm: 4 }}
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
                    <HStack spacing={{ base: 3, sm: 4 }}>
                      <Avatar
                        src={model.avatarUrl}
                        name={model.name}
                        size={{ base: 'sm', sm: 'md' }}
                      />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text
                          fontSize={{ base: 'sm', sm: 'md' }}
                          fontWeight="medium"
                        >
                          {model.name}
                        </Text>
                        <Text
                          fontSize={{ base: 'xs', sm: 'sm' }}
                          color="gray.500"
                        >
                          {model.usernames
                            .filter((u) => !u.username.includes('-'))
                            .map((u) => u.username)
                            .join(' / ')}
                        </Text>
                      </VStack>
                    </HStack>
                  </ListItem>
                );
              })}

              {/* View All Results Footer */}
              <ListItem
                p={{ base: 3, sm: 4 }}
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
                <Text
                  fontSize={{ base: 'sm', sm: 'md' }}
                  color="blue.600"
                  fontWeight="medium"
                >
                  See all results for "{searchQuery}" →
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
              p={{ base: 6, sm: 8 }}
              textAlign="center"
              zIndex={1001}
            >
              {searchQuery.trim().length < 3 ? (
                <>
                  <Text color="gray.500" fontSize={{ base: 'sm', sm: 'md' }}>
                    Please enter at least 3 characters to search
                  </Text>
                  <Text
                    color="gray.400"
                    fontSize={{ base: 'xs', sm: 'sm' }}
                    mt={2}
                  >
                    Keyword is too short
                  </Text>
                </>
              ) : (
                <>
                  <Text color="gray.500" fontSize={{ base: 'sm', sm: 'md' }}>
                    No results found for "{searchQuery}"
                  </Text>
                  <Text
                    color="gray.400"
                    fontSize={{ base: 'xs', sm: 'sm' }}
                    mt={2}
                  >
                    Try searching with a different keyword
                  </Text>
                </>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
