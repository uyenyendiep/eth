import { Box, Image, Flex, Text, Skeleton } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { FaPlayCircle } from 'react-icons/fa';

export default function CombinedThumbnail({
  media,
  modelName,
  height = { base: '70vw', sm: '400px', md: '450px', lg: '500px' }, // 70% width on mobile
  spacing = '5px',
  maxImages = 3,
  showPlayIcon = false
}) {
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const hasVideo = media.some((m) => m.type === 'VIDEO');

  useEffect(() => {
    // Nếu có video, chỉ tìm và hiển thị ảnh WebP
    if (hasVideo) {
      const webpImage = media.find((m) => {
        return (
          (m.type === 'IMAGE' || m.type === 'GIF') &&
          m.url.toLowerCase().endsWith('.webp')
        );
      });

      if (webpImage) {
        setImageUrls([webpImage.url]);
      } else {
        // Fallback: nếu không có WebP, lấy ảnh đầu tiên
        const firstImage = media
          .filter((m) => m.type === 'IMAGE' || m.type === 'GIF')
          .slice(0, 1)
          .map((m) => m.url);
        setImageUrls(firstImage);
      }
    } else {
      // Không có video: hiển thị nhiều ảnh như cũ
      const images = media
        .filter((m) => m.type === 'IMAGE' || m.type === 'GIF')
        .slice(0, maxImages)
        .map((m) => m.url);
      setImageUrls(images);
    }

    setLoading(false);
  }, [media, maxImages, hasVideo]);

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
        {showPlayIcon && hasVideo && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            color="white"
            opacity={0.8}
            pointerEvents="none"
          >
            <FaPlayCircle size={60} />
          </Box>
        )}
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
