import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Shuffle, Star, Upload, X } from "lucide-react";
import { eventCoverService } from "../../services/event-cover.service";
import "./EventCoverPicker.css";

interface EventCoverPickerProps {
  isOpen: boolean;
  title?: string;
  currentCover: string | null;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  onUploadClick: () => void;
}

const RECOMMENDED_KEY = "__recommended__";

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function EventCoverPicker({
  isOpen,
  title = "Choose Cover",
  currentCover,
  onClose,
  onSelect,
  onUploadClick,
}: EventCoverPickerProps) {
  const [imagesByCategory, setImagesByCategory] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>(RECOMMENDED_KEY);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(currentCover);

  const modalRef = useRef<HTMLDivElement>(null);
  const imageGridRef = useRef<HTMLDivElement>(null);
  const isRecommendedView = activeCategory === RECOMMENDED_KEY;

  useEffect(() => {
    setSelectedImage(currentCover);
  }, [currentCover]);

  useEffect(() => {
    if (!isOpen) return;
    if (categories.length > 0) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [data, featured] = await Promise.all([
          eventCoverService.getAll(),
          eventCoverService.getFeaturedCategories(),
        ]);
        const cats = Object.keys(data).sort((a, b) =>
          formatCategoryName(a).localeCompare(formatCategoryName(b))
        );

        setImagesByCategory(data);
        setFeaturedCategories(featured);
        setCategories(cats);
      } catch (error) {
        console.error("Failed to fetch cover images:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isOpen, categories.length]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveCategory(RECOMMENDED_KEY);
  }, [isOpen]);

  useEffect(() => {
    if (imageGridRef.current) {
      imageGridRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  const handleImageClick = useCallback(
    (imageUrl: string) => {
      setSelectedImage(imageUrl);
      onSelect(imageUrl);
      onClose();
    },
    [onClose, onSelect]
  );

  const handleRandom = useCallback(() => {
    if (categories.length === 0) return;

    const generalCategory = categories.find((category) => category.toLowerCase() === "general");
    if (!generalCategory) return;

    const images = imagesByCategory[generalCategory] ?? [];
    if (images.length === 0) return;

    const randomImage = images[Math.floor(Math.random() * images.length)];
    setActiveCategory(generalCategory);
    setSelectedImage(randomImage);
    onSelect(randomImage);
  }, [categories, imagesByCategory, onSelect]);

  const featuredCategoryList = useMemo(
    () => categories.filter((category) => featuredCategories.has(category)),
    [categories, featuredCategories]
  );

  const currentImages = useMemo(() => {
    if (isRecommendedView || !activeCategory) return [];
    return imagesByCategory[activeCategory] ?? [];
  }, [activeCategory, imagesByCategory, isRecommendedView]);

  if (!isOpen) return null;

  return (
    <div className="cover-picker-overlay" onClick={handleBackdropClick}>
      <div ref={modalRef} className="cover-picker-modal">
        <div className="cover-picker-header">
          <h2>{title}</h2>
          <div className="cover-picker-header-actions">
            <button type="button" className="cover-picker-btn" onClick={onUploadClick}>
              <Upload size={16} />
              Upload
            </button>
            <button
              type="button"
              className="cover-picker-btn cover-picker-btn-primary"
              onClick={handleRandom}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Shuffle size={16} />}
              Random
            </button>
            <button type="button" className="cover-picker-icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="cover-picker-body">
          <aside className="cover-picker-sidebar">
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="cover-picker-sidebar-skeleton" />
              ))
            ) : (
              [RECOMMENDED_KEY, ...categories].map((item) => {
                const isRecommended = item === RECOMMENDED_KEY;
                const isActive = activeCategory === item;

                return (
                  <button
                    key={item}
                    type="button"
                    className={`cover-picker-sidebar-item${isActive ? " active" : ""}${isRecommended ? " recommended" : ""}`}
                    onClick={() => setActiveCategory(item)}
                  >
                    {isRecommended && <Star size={14} />}
                    {isRecommended ? "Recommended" : formatCategoryName(item)}
                  </button>
                );
              })
            )}
          </aside>

          <div ref={imageGridRef} className="cover-picker-grid-wrap">
            {loading ? (
              <div className="cover-picker-grid">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="cover-picker-card-skeleton" />
                ))}
              </div>
            ) : isRecommendedView ? (
              featuredCategoryList.length === 0 ? (
                <div className="cover-picker-empty">No featured categories available.</div>
              ) : (
                <div className="cover-picker-grid cover-picker-grid-featured">
                  {featuredCategoryList.map((category) => {
                    const images = imagesByCategory[category] ?? [];
                    const thumbnail = images[0];

                    return (
                      <button
                        key={category}
                        type="button"
                        className="cover-picker-featured-card"
                        onClick={() => setActiveCategory(category)}
                      >
                        {thumbnail ? (
                          <img src={thumbnail} alt={formatCategoryName(category)} />
                        ) : (
                          <div className="cover-picker-featured-placeholder" />
                        )}
                        <div className="cover-picker-featured-overlay" />
                        <div className="cover-picker-featured-text">
                          <span>{formatCategoryName(category)}</span>
                          <small>{images.length} covers</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : currentImages.length === 0 ? (
              <div className="cover-picker-empty">No images available in this category.</div>
            ) : (
              <div className="cover-picker-grid">
                {currentImages.map((imageUrl, index) => (
                  <button
                    key={`${activeCategory}-${index}`}
                    type="button"
                    className={`cover-picker-image-card${selectedImage === imageUrl ? " selected" : ""}`}
                    onClick={() => handleImageClick(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`${formatCategoryName(activeCategory)} cover ${index + 1}`}
                    />
                    {selectedImage === imageUrl && (
                      <span className="cover-picker-selected-badge">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
