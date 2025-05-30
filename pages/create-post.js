// pages/create-post.js
import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  Heading,
  Text,
  useToast,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';
import { useRouter } from 'next/router';

export async function getServerSideProps() {
  const prisma = new PrismaClient();
  const models = await prisma.model.findMany({
    include: {
      usernames: true,
      _count: {
        select: { posts: true }
      }
    }
  });
  await prisma.$disconnect();
  return {
    props: {
      models: JSON.parse(JSON.stringify(models))
    }
  };
}

export default function CreatePostLocalFull({ models }) {
  const [title, setTitle] = useState('');
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const [allFiles, setAllFiles] = useState([]); // Tất cả file được upload
  const [filteredFiles, setFilteredFiles] = useState([]); // File đã lọc theo logic
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const toast = useToast();
  const router = useRouter();

  // Lấy thông tin model hiện tại
  const currentModel = models.find((m) => m.id === modelId);
  const primaryUsername = currentModel?.usernames.find(
    (u) => u.isPrimary
  )?.username;
  const nextPostNumber = (currentModel?._count?.posts || 0) + 1;
  const expectedFolderPath = primaryUsername
    ? `/media/${primaryUsername}/post-${nextPostNumber}/`
    : '';

  const onDirSelect = (e) => {
    const fileList = Array.from(e.target.files);
    const allFilesData = fileList.map((file) => {
      const relativePath = file.webkitRelativePath;
      // Tạo đường dẫn đầy đủ từ root
      const fullPath = `/${relativePath}`;

      const type = file.type.startsWith('video/')
        ? 'VIDEO'
        : file.type === 'image/gif'
        ? 'GIF'
        : 'IMAGE';

      return {
        relativePath,
        fullPath,
        type,
        fileName: file.name,
        size: file.size
      };
    });

    setAllFiles(allFilesData);

    // Lọc file theo logic
    filterFilesByModel(allFilesData, modelId);
  };

  const filterFilesByModel = (files, selectedModelId) => {
    const model = models.find((m) => m.id === selectedModelId);
    if (!model) {
      setFilteredFiles([]);
      return;
    }

    const primaryUser = model.usernames.find((u) => u.isPrimary);
    if (!primaryUser) {
      setFilteredFiles([]);
      toast({
        title: 'Model không có primary username',
        status: 'warning'
      });
      return;
    }

    const postCount = model._count.posts + 1;
    const targetFolder = `/media/${primaryUser.username}/post-${postCount}/`;

    // Lọc các file có đường dẫn chứa target folder
    const filtered = files.filter((file) =>
      file.fullPath.includes(targetFolder)
    );

    setFilteredFiles(filtered);

    // Tự động chọn thumbnail
    const thumbByName = filtered.find((f) =>
      f.fileName.toLowerCase().includes('thumbnail')
    );
    const firstImg = filtered.find((f) => f.type === 'IMAGE');

    setThumbnailUrl(thumbByName?.fullPath || firstImg?.fullPath || '');
  };

  // Khi thay đổi model, lọc lại file
  const handleModelChange = (newModelId) => {
    setModelId(newModelId);
    if (allFiles.length > 0) {
      filterFilesByModel(allFiles, newModelId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!filteredFiles.length) {
      return toast({
        title: 'Không tìm thấy file nào phù hợp với cấu trúc thư mục',
        description: `Cần có file trong thư mục: ${expectedFolderPath}`,
        status: 'error'
      });
    }

    if (!thumbnailUrl) {
      return toast({
        title: 'Không tìm được thumbnail',
        status: 'error'
      });
    }

    try {
      const payload = {
        title: title || `Post ${nextPostNumber}`,
        thumbnailUrl,
        modelId,
        media: filteredFiles.map((f) => ({
          url: f.fullPath,
          type: f.type
        }))
      };

      const res = await fetch('/api/posts/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Unknown error');
      }

      toast({
        title: 'Tạo post thành công!',
        status: 'success'
      });
      router.push('/');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Lỗi khi tạo post',
        description: err.message,
        status: 'error'
      });
    }
  };

  return (
    <Box maxW="600px" mx="auto" p={4}>
      <Heading mb={4}>Tạo Post</Heading>

      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          {/* Chọn Model */}
          <FormControl isRequired>
            <FormLabel>Chọn Model</FormLabel>
            <Select
              value={modelId}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {models.map((m) => {
                const primary = m.usernames.find((u) => u.isPrimary);
                return (
                  <option key={m.id} value={m.id}>
                    {m.name} ({primary?.username || 'No primary'}) - Posts:{' '}
                    {m._count.posts}
                  </option>
                );
              })}
            </Select>
          </FormControl>

          {/* Thông tin thư mục mong đợi */}
          {expectedFolderPath && (
            <Alert status="info">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Thư mục mong đợi:</Text>
                <Text fontSize="sm">{expectedFolderPath}</Text>
              </Box>
            </Alert>
          )}

          {/* Title (optional) */}
          <FormControl>
            <FormLabel>Tiêu đề (tùy chọn)</FormLabel>
            <Input
              placeholder={`Post ${nextPostNumber}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          {/* Chọn thư mục media */}
          <FormControl isRequired>
            <FormLabel>Chọn thư mục media gốc</FormLabel>
            <Input
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={onDirSelect}
            />
            <Text fontSize="sm" color="gray.500">
              Chọn thư mục /media để tự động lọc file theo cấu trúc.
            </Text>
          </FormControl>

          {/* Hiển thị số lượng file */}
          {allFiles.length > 0 && (
            <Box>
              <Text fontSize="sm" color="gray.600">
                Tổng số file: {allFiles.length} | File phù hợp:{' '}
                {filteredFiles.length}
              </Text>
            </Box>
          )}

          {/* Danh sách file đã lọc */}
          {filteredFiles.length > 0 && (
            <Box>
              <Heading size="sm" mb={2}>
                File sẽ được thêm vào database
              </Heading>
              <Stack spacing={1} maxH="200px" overflowY="auto">
                {filteredFiles.map((f, idx) => (
                  <Text
                    key={idx}
                    fontSize="sm"
                    bg="green.50"
                    p={1}
                    borderRadius="md"
                  >
                    {f.fileName} → {f.fullPath} ({f.type})
                  </Text>
                ))}
              </Stack>
            </Box>
          )}

          {/* Thumbnail */}
          <FormControl isRequired>
            <FormLabel>Thumbnail URL</FormLabel>
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
            />
            <Text fontSize="sm" color="gray.500">
              Tự động chọn file chứa "thumbnail" hoặc file IMAGE đầu tiên.
            </Text>
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            isDisabled={filteredFiles.length === 0}
          >
            Tạo Post ({filteredFiles.length} files)
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
