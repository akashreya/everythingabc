import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';

const Images = () => {
  const { getImages, updateImageStatus, getProgressStats, loading, error } = useApi();
  const [images, setImages] = useState([]);
  const [progressStats, setProgressStats] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    letter: '',
    status: 'pending'
  });
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const loadImages = useCallback(async () => {
    try {
      const result = await getImages(filters, page, 20);
      if (result) {
        setImages(result.images || []);
        setTotalPages(Math.ceil((result.total || 0) / 20));
      }
    } catch (err) {
      console.error('Failed to load images:', err);
    }
  }, [getImages, filters, page]);

  const loadProgressStats = useCallback(async () => {
    try {
      const stats = await getProgressStats();
      setProgressStats(stats);
    } catch (err) {
      console.error('Failed to load progress stats:', err);
    }
  }, [getProgressStats]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    loadProgressStats();
  }, [loadProgressStats]);

  const handleStatusUpdate = async (imageId, status, reason = null) => {
    try {
      await updateImageStatus(imageId, status, reason);
      await loadImages();
      await loadProgressStats();
    } catch (err) {
      console.error('Failed to update image status:', err);
    }
  };

  const handleBulkAction = async (action) => {
    const updates = Array.from(selectedImages).map(imageId => 
      updateImageStatus(imageId, action)
    );
    
    try {
      await Promise.all(updates);
      setSelectedImages(new Set());
      await loadImages();
      await loadProgressStats();
    } catch (err) {
      console.error('Failed to perform bulk action:', err);
    }
  };

  const toggleImageSelection = (imageId) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  const renderProgressStats = () => {
    if (!progressStats) return null;

    const { totalItems, completedItems, pendingItems, averageCompletion } = progressStats;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
            <div className="text-sm text-gray-500">Total Items</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600">{completedItems}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingItems}</div>
            <div className="text-sm text-gray-500">Pending Review</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-purple-600">{averageCompletion?.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Avg Completion</div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="card mb-6">
      <div className="card-body">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-48">
            <input
              type="text"
              placeholder="Filter by category..."
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-24">
            <select
              value={filters.letter}
              onChange={(e) => setFilters({...filters, letter: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Letters</option>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                <option key={letter} value={letter}>{letter}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-32">
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-2 rounded-md ${view === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 rounded-md ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              List
            </button>
          </div>
        </div>

        {selectedImages.size > 0 && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleBulkAction('approved')}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Approve Selected ({selectedImages.size})
            </button>
            <button
              onClick={() => handleBulkAction('rejected')}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Reject Selected ({selectedImages.size})
            </button>
            <button
              onClick={() => setSelectedImages(new Set())}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderImageCard = (image) => (
    <div key={image._id} className="card">
      <div className="relative">
        <img
          src={image.url}
          alt={`${image.category} ${image.letter} ${image.itemName}`}
          className="w-full h-48 object-cover rounded-t-lg"
          onError={(e) => {
            e.target.src = '/placeholder-image.png';
          }}
        />
        <input
          type="checkbox"
          checked={selectedImages.has(image._id)}
          onChange={() => toggleImageSelection(image._id)}
          className="absolute top-2 left-2 w-5 h-5"
        />
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
          image.status === 'approved' ? 'bg-green-100 text-green-800' :
          image.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {image.status}
        </div>
      </div>
      <div className="card-body">
        <div className="text-sm font-medium">{image.category} - {image.letter}</div>
        <div className="text-sm text-gray-600">{image.itemName}</div>
        <div className="text-xs text-gray-500 mt-2">
          Source: {image.source} | Quality: {image.qualityScore?.toFixed(1) || 'N/A'}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleStatusUpdate(image._id, 'approved')}
            className="flex-1 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            disabled={loading}
          >
            Approve
          </button>
          <button
            onClick={() => handleStatusUpdate(image._id, 'rejected')}
            className="flex-1 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            disabled={loading}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );

  const renderImageList = (image) => (
    <div key={image._id} className="card">
      <div className="card-body flex items-center gap-4">
        <input
          type="checkbox"
          checked={selectedImages.has(image._id)}
          onChange={() => toggleImageSelection(image._id)}
          className="w-5 h-5"
        />
        <img
          src={image.url}
          alt={`${image.category} ${image.letter} ${image.itemName}`}
          className="w-16 h-16 object-cover rounded"
          onError={(e) => {
            e.target.src = '/placeholder-image.png';
          }}
        />
        <div className="flex-1">
          <div className="font-medium">{image.category} - {image.letter}</div>
          <div className="text-sm text-gray-600">{image.itemName}</div>
          <div className="text-xs text-gray-500">
            Source: {image.source} | Quality: {image.qualityScore?.toFixed(1) || 'N/A'}
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          image.status === 'approved' ? 'bg-green-100 text-green-800' :
          image.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {image.status}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusUpdate(image._id, 'approved')}
            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            disabled={loading}
          >
            Approve
          </button>
          <button
            onClick={() => handleStatusUpdate(image._id, 'rejected')}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            disabled={loading}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-2 border rounded-md disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-4 py-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-3 py-2 border rounded-md disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Images</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and manage collected images with progress tracking
        </p>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-body text-red-700">
            Error: {error}
          </div>
        </div>
      )}

      {renderProgressStats()}
      {renderFilters()}

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading images...</p>
        </div>
      )}

      {!loading && images.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500">No images found matching your criteria.</p>
          </div>
        </div>
      ) : (
        <>
          <div className={view === 'grid' ? 
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 
            'space-y-4'
          }>
            {images.map(image => 
              view === 'grid' ? renderImageCard(image) : renderImageList(image)
            )}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default Images;