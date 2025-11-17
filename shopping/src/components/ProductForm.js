// components/ProductForm.jsx
import { useState, useRef } from 'react';
import { api } from '../services/api';
// Optional
// import '../components/ProductForm.css';

export default function ProductForm() {
  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    size: '',
    color: ''
  });

  // File states
  const [mainFile, setMainFile] = useState(null);
  const [extraFiles, setExtraFiles] = useState([]);

  // Refs to reset file inputs
  const mainFileInputRef = useRef(null);
  const extraFilesInputRef = useRef(null);

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!mainFile) {
      alert('Please select a main image!');
      return;
    }

    try {
      await api.uploadProduct(form, mainFile, extraFiles);
      alert('Product uploaded successfully!');

      // Reset form
      setForm({
        name: '', description: '', price: '', stock: '',
        category: '', size: '', color: ''
      });
      setMainFile(null);
      setExtraFiles([]);

      // Reset file inputs
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
      if (extraFilesInputRef.current) extraFilesInputRef.current.value = '';
    } catch (err) {
      alert(err.message || 'Upload failed');
    }
  };

  return (
    <div className="admin-panel">
      <div className="form-container">
        <h2>Add New Product</h2>

        <form onSubmit={handleSubmit} className="product-form">
          <input
            type="text"
            placeholder="Product Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="3"
          />

          <div className="row">
            <input
              type="number"
              placeholder="Price *"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Stock *"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              required
            />
          </div>

          <div className="row">
            <input
              type="text"
              placeholder="Category *"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Size *"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              required
            />
          </div>

          <input
            type="text"
            placeholder="Color *"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            required
          />

          <div className="file-upload">
            <label>Main Image *:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setMainFile(e.target.files[0])}
              ref={mainFileInputRef}
              required
            />
            {mainFile && <p className="file-name">Selected: {mainFile.name}</p>}
          </div>

          <div className="file-upload">
            <label>Extra Images (Optional):</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setExtraFiles(Array.from(e.target.files))}
              ref={extraFilesInputRef}
            />
            {extraFiles.length > 0 && (
              <p className="file-name">
                {extraFiles.length} file(s) selected
              </p>
            )}
          </div>

          <button type="submit" className="upload-btn">
            Upload Product
          </button>
        </form>
      </div>
    </div>
  );
}