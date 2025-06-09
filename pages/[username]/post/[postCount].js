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
  AspectRatio
} from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';
import { FaImage, FaVideo } from 'react-icons/fa';
import { FaLongArrowAltLeft } from 'react-icons/fa';

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

  return {
    props: {
      post: JSON.parse(JSON.stringify(post))
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

  return {
    paths,
    fallback: false
  };
}

export default function PostDetail({ post }) {
  const { model, media } = post;
  const usernames = model.usernames.map((u) => u.username).join(' / ');
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
    <Box maxW="600px" mx="auto" p={4}>
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
            {item.type === 'VIDEO' && (
              <AspectRatio ratio={16 / 9}>
                <iframe
                  src={item.url}
                  title="video"
                  allowFullScreen
                  style={{ borderRadius: '8px' }}
                />
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
  );
}
