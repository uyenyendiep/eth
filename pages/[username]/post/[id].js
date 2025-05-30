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
  AspectRatio
} from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';
import { FaLongArrowAltLeft } from 'react-icons/fa';

export async function getStaticProps({ params }) {
  const prisma = new PrismaClient();

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      model: {
        include: {
          usernames: true
        }
      },
      media: true
    }
  });

  return {
    props: {
      post: JSON.parse(JSON.stringify(post)) // để tránh lỗi serializable với Date
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
      if (!primaryUsername) return null;

      return {
        params: {
          username: primaryUsername.username,
          id: post.id
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

  return (
    <Box maxW="600px" mx="auto" p={4}>
      {/* Model Info */}
      <Stack direction="row" spacing={4} align="center" mb={4}>
        <Avatar src={model.avatarUrl} name={model.name} size="lg" />
        <Box>
          <Heading size="md">{model.name}</Heading>
          <Text fontSize="sm" color="gray.500">
            {usernames}
          </Text>
        </Box>
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

      {/* Back Button
      <Link href="/" passHref>
        <Button as={ChakraLink} mt={6} leftIcon={<FaLongArrowAltLeft />}>
          Quay lại
        </Button>
      </Link> */}
    </Box>
  );
}
