import {
  Box,
  Heading,
  Text,
  Image,
  Stack,
  Avatar,
  Button,
  ChakraLink,
  Link,
  HStack,
  Icon,
  AspectRatio,
  VStack,
  List,
  ListItem,
  Center
} from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';
import { FaImage, FaVideo, FaMapMarkerAlt } from 'react-icons/fa';
import { FaLongArrowAltLeft } from 'react-icons/fa';
import { useState, useEffect } from 'react';

// Component ModelCard tương tự trang models.js nhưng với chiều cao 500px
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
      <Link
        href={`/${primaryUsername}`}
        passHref
        _hover={{ textDecoration: 'none' }}
      >
        <Box
          as={ChakraLink}
          display="block"
          _hover={{ textDecoration: 'none' }}
        >
          {/* Avatar Image 800x500 */}
          <Box
            width="100%"
            height="400px"
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

export async function getStaticProps({ params }) {
  const prisma = new PrismaClient();

  // Tìm model theo username
  const username = await prisma.username.findFirst({
    where: {
      username: params.username,
      isPrimary: true
    },
    include: {
      model: true
    }
  });

  if (!username) {
    return { notFound: true };
  }

  // Tìm post theo postCount
  const post = await prisma.post.findFirst({
    where: {
      modelId: username.model.id,
      postCount: parseInt(params.postCount)
    },
    include: {
      model: {
        include: {
          usernames: true
        }
      },
      media: true
    }
  });

  if (!post) {
    return { notFound: true };
  }

  // Lấy 5 models ngẫu nhiên (trừ model hiện tại)
  const allModels = await prisma.model.findMany({
    where: {
      id: {
        not: username.model.id
      }
    },
    include: {
      usernames: true,
      _count: {
        select: { posts: true }
      }
    }
  });

  // Shuffle và lấy 5 models ngẫu nhiên
  const shuffled = allModels.sort(() => 0.5 - Math.random());
  const randomModels = shuffled.slice(0, 5);

  await prisma.$disconnect();

  return {
    props: {
      post: JSON.parse(JSON.stringify(post)),
      randomModels: JSON.parse(JSON.stringify(randomModels))
    }
  };
}

export async function getStaticPaths() {
  const prisma = new PrismaClient();
  const posts = await prisma.post.findMany({
    include: {
      model: {
        include: {
          usernames: true
        }
      }
    }
  });

  const paths = posts
    .map((post) => {
      const primaryUsername = post.model.usernames.find((u) => u.isPrimary);
      if (!primaryUsername || !post.postCount) return null;

      return {
        params: {
          username: primaryUsername.username,
          postCount: post.postCount.toString()
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

export default function PostDetail({ post, randomModels }) {
  const { model, media } = post;
  const usernames = model.usernames
    .filter((u) => !u.username.includes('-'))
    .map((u) => u.username)
    .join(' / ');
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
    <Box>
      {/* Post Detail Section */}
      <Box maxW="800px" mx="auto" p={4}>
        {/* Model Info */}
        <Stack direction="row" spacing={4} align="center" mb={4}>
          <Link href={`/${primaryUsername}`} passHref legacyBehavior>
            <Avatar src={model.avatarUrl} name={model.name} size="lg" />
          </Link>
          <Box>
            <Link
              href={`/${primaryUsername}`}
              _hover={{ textDecoration: 'none' }}
              passHref
              legacyBehavior
            >
              <Heading size="md" width="fit-content" display="inline">
                {model.name}
              </Heading>
            </Link>
            <Link
              href={`/${primaryUsername}`}
              _hover={{ textDecoration: 'none' }}
              passHref
              legacyBehavior
            >
              <Text fontSize="sm" color="gray.500">
                {usernames}
              </Text>
            </Link>
          </Box>

          <HStack spacing={3} ml="auto">
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
        </Stack>

        {/* Media List */}
        <Stack spacing={4}>
          {media.map((item) => (
            <Box key={item.id} width="100%">
              {item.type === 'IMAGE' && (
                <Image
                  src={item.url}
                  alt="media"
                  borderRadius="md"
                  width="100%"
                  objectFit="cover"
                />
              )}
              {/* {item.type === 'VIDEO' && (
                <AspectRatio ratio={16 / 9}>
                  <iframe
                    src={item.url}
                    title="video"
                    allowFullScreen
                    style={{ borderRadius: '8px' }}
                  />
                </AspectRatio>
              )} */}
              {item.type === 'VIDEO' && (
                <AspectRatio ratio={16 / 9}>
                  <video
                    controls
                    controlsList="nodownload"
                    style={{
                      borderRadius: '8px',
                      backgroundColor: 'black',
                      objectFit: 'contain'
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    disablePictureInPicture
                    playsInline
                  >
                    <source src={item.url} type="video/mp4" />
                  </video>
                </AspectRatio>
              )}
              {item.type === 'GIF' && (
                <Image
                  src={item.url}
                  alt="gif"
                  borderRadius="md"
                  width="100%"
                  objectFit="cover"
                />
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* You May Also Like Section */}
      {randomModels && randomModels.length > 0 && (
        <Box mt={4} py={2} bg="gray.50">
          <Box maxW="800px" mx="auto" px={4}>
            {/* <Center mb={6}>
              <Heading size="lg">You may also like</Heading>
            </Center> */}

            <Center mb={9} position="relative" width="100%">
              <Box
                position="absolute"
                top="50%"
                left={0}
                right={0}
                height="1px"
                bg="gray.300"
                transform="translateY(-50%)"
              />
              <Text
                as="span"
                fontSize="sm"
                fontWeight="bold"
                color="gray.500"
                position="relative"
                zIndex={1}
                px={4} // Tạo khoảng padding che line phía sau
                bg="gray.50" // Nền màu trùng màu nền section
              >
                YOU MAY ALSO LIKE
              </Text>
            </Center>

            <List>
              {randomModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </List>
          </Box>
        </Box>
      )}
    </Box>
  );
}
