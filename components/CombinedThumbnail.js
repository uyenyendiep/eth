import { Box, Image, Flex, Text, Skeleton } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

export default function CombinedThumbnail({
  media,
  modelName,
  height = '400px',
  spacing = '5px',
  maxImages = 3
}) {
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});

  useEffect(() => {
    const images = media
      .filter((m) => m.type === 'IMAGE' || m.type === 'GIF')
      .slice(0, maxImages)
      .map((m) => m.url);

    setImageUrls(images);
    setLoading(false);
  }, [media, maxImages]);

  const handleImageLoad = (index) => {
    setLoadedImages((prev) => ({ ...prev, [index]: true }));
  };

  if (loading) {
    return <Skeleton height={height} />;
  }

  if (imageUrls.length === 0) {
    return (
      <Box
        width="100%"
        height={height}
        bg="gray.200"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="gray.500">No images</Text>
      </Box>
    );
  }

  if (imageUrls.length === 1) {
    return (
      <Box position="relative" width="100%" height={height}>
        {!loadedImages[0] && (
          <Skeleton position="absolute" width="100%" height="100%" />
        )}
        <Image
          src={imageUrls[0]}
          alt={modelName}
          objectFit="cover"
          width="100%"
          height="100%"
          onLoad={() => handleImageLoad(0)}
        />
      </Box>
    );
  }

  return (
    <Flex width="100%" height={height} bg="black" gap={spacing}>
      {imageUrls.map((url, index) => (
        <Box
          key={index}
          flex={1}
          height="100%"
          overflow="hidden"
          position="relative"
        >
          {!loadedImages[index] && (
            <Skeleton position="absolute" width="100%" height="100%" />
          )}
          <Image
            src={url}
            alt={`${modelName} ${index + 1}`}
            objectFit="cover"
            width="100%"
            height="100%"
            onLoad={() => handleImageLoad(index)}
            transition="opacity 0.3s"
            opacity={loadedImages[index] ? 1 : 0}
          />
        </Box>
      ))}
    </Flex>
  );
}
