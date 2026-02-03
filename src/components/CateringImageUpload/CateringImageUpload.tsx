import React from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import "./CateringImageUpload.css";

interface CateringImageUploadProps {
  imageUrl: string | undefined;
  isUploading: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
}

const CateringImageUpload: React.FC<CateringImageUploadProps> = ({
  imageUrl,
  isUploading,
  onImageSelect,
  onImageRemove,
}) => {
  return (
    <div className="catering-image-upload">
      {imageUrl ? (
        <div className="catering-image-preview">
          <img src={imageUrl} alt="Catering" className="catering-preview-img" />
          <div className="catering-image-actions">
            <label className="btn btn-secondary btn-sm">
              <Upload size={14} />
              Change
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onImageSelect}
                style={{ display: "none" }}
                disabled={isUploading}
              />
            </label>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={onImageRemove}
              disabled={isUploading}
            >
              <X size={14} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="catering-image-dropzone">
          {isUploading ? (
            <>
              <div className="btn-spinner"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <ImageIcon size={32} />
              <span>Click to upload catering image</span>
              <span className="dropzone-hint">JPEG, PNG, WebP or GIF (max 10MB)</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onImageSelect}
            style={{ display: "none" }}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
};

export default CateringImageUpload;
