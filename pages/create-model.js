// pages/create-model.js
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
  Checkbox,
  IconButton,
  Flex,
  Spacer,
  HStack
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

export default function CreateModel() {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [location, setLocation] = useState('');
  const [usernames, setUsernames] = useState([
    { username: '', isPrimary: true }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const router = useRouter();

  const addUsername = () => {
    setUsernames([...usernames, { username: '', isPrimary: false }]);
  };

  const removeUsername = (index) => {
    if (usernames.length > 1) {
      const newUsernames = usernames.filter((_, i) => i !== index);
      // Nếu xóa primary username, set primary cho username đầu tiên
      if (usernames[index].isPrimary && newUsernames.length > 0) {
        newUsernames[0].isPrimary = true;
      }
      setUsernames(newUsernames);
    }
  };

  const updateUsername = (index, field, value) => {
    const newUsernames = [...usernames];

    if (field === 'isPrimary' && value) {
      // Chỉ cho phép 1 primary username
      newUsernames.forEach((u, i) => {
        u.isPrimary = i === index;
      });
    } else {
      newUsernames[index][field] = value;
    }

    setUsernames(newUsernames);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    if (!name.trim()) {
      toast({ title: 'Tên model là bắt buộc', status: 'error' });
      setIsSubmitting(false);
      return;
    }

    if (!avatarUrl.trim()) {
      toast({ title: 'Avatar URL là bắt buộc', status: 'error' });
      setIsSubmitting(false);
      return;
    }

    const validUsernames = usernames.filter((u) => u.username.trim());
    if (validUsernames.length === 0) {
      toast({ title: 'Ít nhất 1 username là bắt buộc', status: 'error' });
      setIsSubmitting(false);
      return;
    }

    const hasPrimary = validUsernames.some((u) => u.isPrimary);
    if (!hasPrimary) {
      toast({ title: 'Phải có ít nhất 1 primary username', status: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        avatarUrl: avatarUrl.trim(),
        location: location.trim() || null,
        usernames: validUsernames.map((u) => ({
          username: u.username.trim(),
          isPrimary: u.isPrimary
        }))
      };

      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Unknown error');
      }

      const result = await res.json();

      toast({
        title: 'Tạo model thành công!',
        description: `Model "${name}" đã được tạo`,
        status: 'success'
      });

      // Reset form
      setName('');
      setAvatarUrl('');
      setLocation('');
      setUsernames([{ username: '', isPrimary: true }]);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Lỗi khi tạo model',
        description: err.message,
        status: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box maxW="600px" mx="auto" p={4}>
      <Flex align="center" mb={6}>
        <Heading>Tạo Model Mới</Heading>
      </Flex>

      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          {/* Tên Model */}
          <FormControl isRequired>
            <FormLabel>Tên Model</FormLabel>
            <Input
              placeholder="Ví dụ: Sophie Rain"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormControl>

          {/* Avatar URL */}
          <FormControl isRequired>
            <FormLabel>Avatar URL</FormLabel>
            <Input
              placeholder="/media/sophie-rain/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </FormControl>

          {/* Location */}
          <FormControl>
            <FormLabel>Địa điểm (tùy chọn)</FormLabel>
            <Input
              placeholder="Ví dụ: USA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          {/* Usernames */}
          <Box>
            <Flex align="center" mb={3}>
              <Text fontWeight="bold">Usernames</Text>
              <Spacer />
              <IconButton
                icon={<AddIcon />}
                size="sm"
                colorScheme="blue"
                onClick={addUsername}
                aria-label="Thêm username"
              />
            </Flex>

            <Stack spacing={3}>
              {usernames.map((user, index) => (
                <Box
                  key={index}
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={3}
                >
                  <Stack spacing={2}>
                    <HStack>
                      <FormControl flex={1}>
                        <Input
                          placeholder="Ví dụ: sophie-rain"
                          value={user.username}
                          onChange={(e) =>
                            updateUsername(index, 'username', e.target.value)
                          }
                        />
                      </FormControl>

                      {usernames.length > 1 && (
                        <IconButton
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => removeUsername(index)}
                          aria-label="Xóa username"
                        />
                      )}
                    </HStack>

                    <Checkbox
                      isChecked={user.isPrimary}
                      onChange={(e) =>
                        updateUsername(index, 'isPrimary', e.target.checked)
                      }
                      colorScheme="blue"
                    >
                      <Text fontSize="sm">Primary Username</Text>
                    </Checkbox>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Text fontSize="sm" color="gray.500" mt={2}>
              Primary username sẽ được sử dụng làm thư mục chính và URL.
            </Text>
          </Box>

          {/* Preview */}
          {name && (
            <Box bg="blue.50" p={3} borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" mb={1}>
                Preview:
              </Text>
              <Text fontSize="sm">Tên: {name}</Text>
              {usernames.find((u) => u.isPrimary && u.username) && (
                <Text fontSize="sm">
                  Primary Username:{' '}
                  {usernames.find((u) => u.isPrimary)?.username}
                </Text>
              )}
              <Text fontSize="sm">
                Thư mục media sẽ là: /media/
                {usernames.find((u) => u.isPrimary)?.username ||
                  '[primary-username]'}
                /
              </Text>
            </Box>
          )}

          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isSubmitting}
            loadingText="Đang tạo..."
          >
            Tạo Model
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
