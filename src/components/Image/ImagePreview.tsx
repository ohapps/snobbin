import { ItemImage } from '@/types/image';
import {
  Box,
  Button,
  Modal,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CldImage } from 'next-cloudinary';
import { useState } from 'react';

const ModalBody = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  flexDirection: 'column',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  borderRadius: '5px',
}));

const ImagePreview = ({ image }: { image: ItemImage }) => {
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const imageSize = smallScreen ? '300' : '400';
  return (
    <>
      <CldImage
        width="150"
        height="150"
        crop="fill"
        src={image.publicId}
        alt="item image"
        onClick={() => setModalOpen(true)}
        style={{
          border: `1px solid ${theme.palette.grey[400]}`,
          cursor: 'pointer',
        }}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="image preview"
        aria-describedby="image preview body"
      >
        <ModalBody>
          <Box>
            <CldImage
              width={imageSize}
              height={imageSize}
              crop="fill"
              src={image.publicId}
              alt="item image"
              style={{
                border: `1px solid ${theme.palette.grey[400]}`,
                cursor: 'pointer',
              }}
            />
          </Box>
          <Button onClick={() => setModalOpen(false)}>CLOSE</Button>
        </ModalBody>
      </Modal>
    </>
  );
};

export default ImagePreview;
