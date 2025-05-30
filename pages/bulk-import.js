// pages/bulk-import.js
import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  Text,
  useToast,
  Alert,
  AlertIcon,
  Progress,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  List,
  ListItem,
  Divider,
  Badge
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function BulkImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const toast = useToast();
  const router = useRouter();

  const onDirSelect = async (e) => {
    const fileList = Array.from(e.target.files);

    if (fileList.length === 0) return;

    setIsProcessing(true);
    setScanResults(null);
    setImportResults(null);

    try {
      // Process files
      const allFiles = fileList.map((file) => {
        const relativePath = file.webkitRelativePath;
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

      // Phân tích files
      const pathRegex = /^\/media\/([^\/]+)\/post-(\d+)\//;
      const postsFound = {};

      allFiles.forEach((file) => {
        const match = file.fullPath.match(pathRegex);
        if (!match) return;

        const [, username, postNumber] = match;
        const key = `${username}_post-${postNumber}`;

        if (!postsFound[key]) {
          postsFound[key] = {
            username,
            postNumber: parseInt(postNumber),
            fileCount: 0,
            hasImage: false,
            hasVideo: false,
            hasThumbnail: false
          };
        }

        postsFound[key].fileCount++;
        if (file.type === 'IMAGE') postsFound[key].hasImage = true;
        if (file.type === 'VIDEO') postsFound[key].hasVideo = true;
        if (file.fileName.toLowerCase().includes('thumbnail')) {
          postsFound[key].hasThumbnail = true;
        }
      });

      const scanSummary = {
        totalFiles: allFiles.length,
        postsFound: Object.keys(postsFound).length,
        posts: Object.values(postsFound)
      };

      setScanResults(scanSummary);

      // Gửi request import
      const response = await fetch('/api/posts/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFiles })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await response.json();
      setImportResults(result);

      if (result.created > 0) {
        toast({
          title: 'Import thành công!',
          description: `Đã tạo ${result.created} posts mới`,
          status: 'success',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Lỗi khi import',
        description: error.message,
        status: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box maxW="800px" mx="auto" p={4}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading>Bulk Import Posts</Heading>
          <HStack>
            <Link href="/create-post" passHref>
              <Button size="sm" variant="outline">
                Tạo Post Đơn
              </Button>
            </Link>
            <Link href="/create-model" passHref>
              <Button size="sm" colorScheme="purple">
                Thêm Model
              </Button>
            </Link>
          </HStack>
        </HStack>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Hướng dẫn:</Text>
            <Text fontSize="sm">
              Chọn thư mục /media để tự động quét và thêm tất cả posts mới. Cấu
              trúc: /media/[username]/post-[number]/
            </Text>
          </Box>
        </Alert>

        <FormControl>
          <FormLabel>Chọn thư mục media</FormLabel>
          <Input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={onDirSelect}
            disabled={isProcessing}
          />
        </FormControl>

        {isProcessing && (
          <Box>
            <Text mb={2}>Đang xử lý...</Text>
            <Progress isIndeterminate />
          </Box>
        )}

        {/* Kết quả scan */}
        {scanResults && (
          <Box borderWidth="1px" borderRadius="lg" p={4}>
            <Heading size="md" mb={3}>
              Kết quả quét
            </Heading>
            <StatGroup>
              <Stat>
                <StatLabel>Tổng files</StatLabel>
                <StatNumber>{scanResults.totalFiles}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Posts tìm thấy</StatLabel>
                <StatNumber>{scanResults.postsFound}</StatNumber>
              </Stat>
            </StatGroup>

            {scanResults.posts.length > 0 && (
              <Box mt={4}>
                <Text fontWeight="bold" mb={2}>
                  Chi tiết posts:
                </Text>
                <List spacing={2} maxH="200px" overflowY="auto">
                  {scanResults.posts.map((post, idx) => (
                    <ListItem key={idx} fontSize="sm">
                      <HStack>
                        <Text>
                          {post.username}/post-{post.postNumber}
                        </Text>
                        <Badge>{post.fileCount} files</Badge>
                        {post.hasThumbnail && (
                          <Badge colorScheme="green">✓ Thumbnail</Badge>
                        )}
                      </HStack>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {/* Kết quả import */}
        {importResults && (
          <Box borderWidth="1px" borderRadius="lg" p={4}>
            <Heading size="md" mb={3}>
              Kết quả import
            </Heading>
            <StatGroup>
              <Stat>
                <StatLabel>Posts đã tạo</StatLabel>
                <StatNumber color="green.500">
                  {importResults.created}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Lỗi</StatLabel>
                <StatNumber color="red.500">
                  {importResults.errors?.length || 0}
                </StatNumber>
              </Stat>
            </StatGroup>

            {importResults.errors && importResults.errors.length > 0 && (
              <Box mt={4}>
                <Text fontWeight="bold" mb={2} color="red.500">
                  Lỗi:
                </Text>
                <List spacing={1}>
                  {importResults.errors.map((error, idx) => (
                    <ListItem key={idx} fontSize="sm" color="red.600">
                      • {error}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {importResults.created > 0 && (
              <Button
                mt={4}
                colorScheme="blue"
                onClick={() => router.push('/')}
                width="full"
              >
                Xem Posts Mới
              </Button>
            )}
          </Box>
        )}
      </VStack>
    </Box>
  );
}
