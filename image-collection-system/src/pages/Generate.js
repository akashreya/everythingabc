import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Zap, 
  Image as ImageIcon, 
  Settings, 
  Play, 
  Pause, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Download
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import { showNotification } from '../components/Common/Notification';

const PreviewCard = ({ preview, index, onDownload, onDiscard, categories }) => {
  const [category, setCategory] = useState(categories[0]?.value || 'animals');
  const [itemName, setItemName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!itemName.trim()) {
      showNotification('error', 'Please enter an item name');
      return;
    }

    setIsDownloading(true);
    try {
      await onDownload({
        ...preview,
        downloadCategory: category,
        downloadItemName: itemName.trim()
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border">
      {/* Image Preview */}
      <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
        <img 
          src={preview.previewUrl} 
          alt={`Preview ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Image Info */}
      <div className="space-y-3">
        <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
          <div>Size: {(preview.fileSize / 1024).toFixed(1)}KB</div>
          <div>Model: {preview.metadata?.model}</div>
        </div>

        {/* Enhanced Prompt */}
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Enhanced:</strong> {preview.enhancedPrompt?.substring(0, 120)}...
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Item Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name
          </label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g., Canistel fruit, Red apple"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading || !itemName.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm py-2 px-3 rounded flex items-center justify-center"
          >
            {isDownloading ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            {isDownloading ? 'Processing...' : 'Download'}
          </button>
          <button
            onClick={() => onDiscard(preview)}
            disabled={isDownloading}
            className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white text-sm py-2 px-3 rounded flex items-center justify-center"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

const Generate = () => {
  const { generateImages, downloadPreview, getGenerationStats, loading } = useApi();
  const [stats, setStats] = useState(null);
  const [activeGeneration, setActiveGeneration] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    prompt: '', // Changed from itemName to generic prompt
    count: 2,
    style: 'photographic',
    quality: 'standard',
    provider: 'googleai',
    useEnhanced: true
  });

  const categories = [
    { value: 'animals', label: 'Animals' },
    { value: 'birds', label: 'Birds' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'plants', label: 'Plants' },
    { value: 'flowers', label: 'Flowers' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'household-items', label: 'Household Items' },
    { value: 'clothing-accessories', label: 'Clothing & Accessories' },
    { value: 'kitchen-tools', label: 'Kitchen Tools' },
    { value: 'music', label: 'Music' },
    { value: 'food', label: 'Food' },
    { value: 'colors-shapes', label: 'Colors & Shapes' },
    { value: 'numbers-letters', label: 'Numbers & Letters' },
    { value: 'insects', label: 'Insects' },
    { value: 'ocean-life', label: 'Ocean Life' },
    { value: 'space-astronomy', label: 'Space & Astronomy' },
    { value: 'school-supplies', label: 'School Supplies' },
    { value: 'medical-equipment', label: 'Medical Equipment' },
    { value: 'construction-tools', label: 'Construction Tools' }
  ];

  const styles = [
    { value: 'photographic', label: 'Photographic' },
    { value: 'illustration', label: 'Illustration' },
    { value: 'artistic', label: 'Artistic' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'detailed', label: 'Detailed' }
  ];

  const qualities = [
    { value: 'standard', label: 'Standard (1024x1024)' },
    { value: 'hd', label: 'HD (1024x1792 or 1792x1024)' }
  ];

  const providers = [
    { value: 'googleai', label: 'Google AI Studio (Free Tier)', available: true },
    { value: 'openai', label: 'OpenAI DALL-E 3 (Paid)', available: false }
  ];

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const statsData = await getGenerationStats();
      setStats(statsData.stats);
      setGenerationHistory(statsData.stats.recentGenerations || []);
      
      // Update provider availability based on stats
      if (statsData.stats.availableProviders) {
        providers.forEach(provider => {
          provider.available = statsData.stats.availableProviders.includes(provider.value);
        });
        
        // If current provider is not available, switch to an available one
        if (!statsData.stats.availableProviders.includes(formData.provider)) {
          const availableProvider = statsData.stats.availableProviders[0];
          if (availableProvider) {
            setFormData(prev => ({ ...prev, provider: availableProvider }));
          }
        }
      }
    } catch (error) {
      showNotification('error', 'Failed to load generation stats');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!formData.prompt.trim()) {
      showNotification('error', 'Please enter a prompt');
      return;
    }

    try {
      const options = {
        style: formData.style,
        quality: formData.quality,
        count: parseInt(formData.count),
        provider: formData.provider,
        useEnhanced: formData.useEnhanced
      };

      setActiveGeneration({
        prompt: formData.prompt,
        startTime: Date.now(),
        status: 'generating'
      });

      showNotification('info', `Starting generation...`);

      const result = await generateImages(
        formData.prompt,
        'general', // Temporary category, will be chosen during download
        options
      );

      setActiveGeneration(prev => ({
        ...prev,
        status: 'completed',
        result
      }));

      if (result.success) {
        // Check if we got previews that need user selection (Google AI)
        const previewImages = result.result?.images?.filter(img => img.previewUrl && !img.url);
        
        if (previewImages && previewImages.length > 0) {
          setImagePreviews(previewImages.map(img => ({
            ...img,
            originalPrompt: formData.prompt
          })));
          showNotification('success', 
            `Generated ${previewImages.length} image previews`, 
            'Previews Ready'
          );
        } else {
          showNotification('success', 
            `Generated ${result.result?.approved || 0} images`, 
            'Generation Complete'
          );
        }
        
        // Refresh stats and history
        await fetchStats();
      } else {
        showNotification('warning', 
          `Generation completed with issues: ${result.result?.message || result.message}`,
          'Generation Warning'
        );
      }

    } catch (error) {
      setActiveGeneration(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));
      
      // Show more helpful error messages for billing issues
      if (error.message.includes('billing_hard_limit_reached') || 
          error.message.includes('billing limit') ||
          error.message.includes('free trial')) {
        showNotification('warning', 
          'OpenAI billing limit reached. Please upgrade to a paid account to use DALL-E image generation.',
          'Billing Limit Reached'
        );
      } else {
        showNotification('error', 
          `Generation failed: ${error.message}`, 
          'Generation Error'
        );
      }
    }
  };

  const formatCost = (cost) => {
    return `$${(cost || 0).toFixed(4)}`;
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const handleDownloadPreview = async (preview) => {
    try {
      const { downloadCategory, downloadItemName } = preview;
      
      showNotification('info', `Downloading and processing ${downloadItemName}...`);
      
      const result = await downloadPreview(
        preview,
        downloadItemName,
        downloadCategory,
        {
          style: formData.style,
          quality: formData.quality,
          useEnhanced: formData.useEnhanced
        }
      );

      if (result.success) {
        showNotification('success', 
          `Successfully processed ${downloadItemName} in ${downloadCategory}`, 
          'Download Complete'
        );
        
        // Remove the preview from the list
        setImagePreviews(prev => prev.filter(p => p !== preview));
        
        // Refresh stats
        await fetchStats();
      } else {
        showNotification('error', 
          `Failed to process ${downloadItemName}: ${result.error}`, 
          'Download Failed'
        );
      }
    } catch (error) {
      showNotification('error', 
        `Download failed: ${error.message}`, 
        'Download Error'
      );
    }
  };

  const handleDiscardPreview = (preview) => {
    setImagePreviews(prev => prev.filter(p => p !== preview));
    showNotification('info', `Discarded preview`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Sparkles className="h-8 w-8 mr-3" />
              AI Image Generation
            </h1>
            <p className="text-purple-100 mt-2">
              Generate high-quality images using DALL-E 3 or Google AI Imagen 3.0
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-600" />
              Generate Images
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image Prompt *
                </label>
                <textarea
                  name="prompt"
                  value={formData.prompt}
                  onChange={handleInputChange}
                  placeholder="e.g., Professional photo of a yellow tropical fruit with smooth skin, Canistel fruit on white background"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe what you want to generate. You'll choose the category and item name when downloading.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Provider
                  </label>
                  <select
                    name="provider"
                    value={formData.provider}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {providers.map(provider => (
                      <option 
                        key={provider.value} 
                        value={provider.value}
                        disabled={!provider.available}
                      >
                        {provider.label} {!provider.available ? '(Unavailable)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.provider === 'googleai' ? 'Free tier - generates actual images with Imagen 3.0' : 'Requires paid account - generates actual images'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Count
                  </label>
                  <select
                    name="count"
                    value={formData.count}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={1}>1 Image</option>
                    <option value={2}>2 Images</option>
                    <option value={3}>3 Images</option>
                    <option value={4}>4 Images</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Style
                  </label>
                  <select
                    name="style"
                    value={formData.style}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {styles.map(style => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality
                  </label>
                  <select
                    name="quality"
                    value={formData.quality}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={formData.provider === 'googleai'}
                  >
                    {qualities.map(quality => (
                      <option key={quality.value} value={quality.value}>
                        {quality.label}
                      </option>
                    ))}
                  </select>
                  {formData.provider === 'googleai' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Quality setting not applicable for Google AI
                    </p>
                  )}
                </div>
              </div>

              {formData.provider === 'googleai' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Google AI Imagen 3.0</p>
                      <p className="mt-1">
                        This will use Google's Imagen 3.0 model to generate high-quality images. 
                        Prompts are enhanced with Gemini before being sent to Imagen for generation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="useEnhanced"
                  checked={formData.useEnhanced}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Use enhanced prompts for better quality
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || (activeGeneration && activeGeneration.status === 'generating')}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center"
              >
                {loading || (activeGeneration && activeGeneration.status === 'generating') ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Images
                  </>
                )}
              </button>
            </form>

            {/* Active Generation Status */}
            {activeGeneration && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Generation Status</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      <strong>{activeGeneration.prompt?.substring(0, 50)}...</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      Started {formatDuration(Date.now() - activeGeneration.startTime)} ago
                    </p>
                  </div>
                  <div className="flex items-center">
                    {activeGeneration.status === 'generating' && (
                      <div className="flex items-center text-blue-600">
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Generating
                      </div>
                    )}
                    {activeGeneration.status === 'completed' && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completed
                      </div>
                    )}
                    {activeGeneration.status === 'error' && (
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Error
                      </div>
                    )}
                  </div>
                </div>
                
                {activeGeneration.result && (
                  <div className="mt-2 text-sm text-gray-600">
                    Generated: {activeGeneration.result.result?.generated || 0} | 
                    Approved: {activeGeneration.result.result?.approved || 0} | 
                    Cost: {formatCost(activeGeneration.result.result?.totalCost)}
                  </div>
                )}
                
                {activeGeneration.error && (
                  <div className="mt-2 text-sm text-red-600">
                    Error: {activeGeneration.error}
                  </div>
                )}
              </div>
            )}

            {/* Image Previews Section */}
            {imagePreviews.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-blue-600" />
                  Image Previews ({imagePreviews.length})
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  Review the generated images and choose which ones to download and process.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {imagePreviews.map((preview, index) => (
                    <PreviewCard 
                      key={index}
                      preview={preview}
                      index={index}
                      categories={categories}
                      onDownload={handleDownloadPreview}
                      onDiscard={handleDiscardPreview}
                    />
                  ))}
                </div>
                
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setImagePreviews([])}
                    className="bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Discard All Previews
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Generation Stats */}
          {stats && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <ImageIcon className="h-5 w-5 mr-2 text-purple-600" />
                Statistics
              </h3>
              
              {/* Show billing warning if not available */}
              {!stats.available && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">AI Generation Unavailable</p>
                      <p className="mt-1">
                        Free trial accounts have limited DALL-E access. 
                        <a 
                          href="https://platform.openai.com/account/billing" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-yellow-900"
                        >
                          Upgrade to paid account
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Generated</span>
                  <span className="font-semibold">{stats.totalGenerated || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Cost</span>
                  <span className="font-semibold text-green-600">
                    {formatCost(stats.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className={`text-sm font-medium ${stats.available ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.available ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Provider</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.activeProvider ? stats.activeProvider.toUpperCase() : 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Providers</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.availableProviders ? stats.availableProviders.length : 0}
                  </span>
                </div>
              </div>

              {stats.openaiStats && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">OpenAI Usage</h4>
                  <div className="text-xs text-gray-600">
                    <div>Daily Requests: {stats.openaiStats.dailyRequests || 0}</div>
                    <div>Monthly Cost: {formatCost(stats.openaiStats.monthlyCost)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Generations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-purple-600" />
              Recent Generations
            </h3>
            
            {generationHistory.length > 0 ? (
              <div className="space-y-3">
                {generationHistory.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.itemName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.category} • Score: {item.qualityScore?.overall?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-600">
                        {formatCost(item.aiGeneration?.cost)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent generations</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Generate;