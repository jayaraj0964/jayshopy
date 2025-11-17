import { useState } from 'react';
import { api } from '../services/api';

export default function ProductUpload() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [mainFile, setMainFile] = useState(null); // ← FILE OBJECT
  const [extraFiles, setExtraFiles] = useState([]); // ← ARRAY OF FILES

  const handleMainFile = (e) => {
    const file = e.target.files[0];
    if (file) setMainFile(file);
  };

  const handleExtraFiles = (e) => {
    const files = Array.from(e.target.files);
    setExtraFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!mainFile) {
      alert('Please select main image!');
      return;
    }

    const productData = {
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      category,
      size,
      color
    };

    try {
      await api.uploadProduct(productData, mainFile, extraFiles);
      alert('Product uploaded!');
      // Reset form
      setName(''); setDescription(''); setPrice(''); setStock('');
      setCategory(''); setSize(''); setColor('');
      setMainFile(null); setExtraFiles([]);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
      <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} required />
      <input type="number" placeholder="Stock" value={stock} onChange={e => setStock(e.target.value)} required />
      <input type="text" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} required />
      <input type="text" placeholder="Size" value={size} onChange={e => setSize(e.target.value)} />
      <input type="text" placeholder="Color" value={color} onChange={e => setColor(e.target.value)} />

      <div>
        <label>Main Image *:</label>
        <input type="file" accept="image/*" onChange={handleMainFile} required />
      </div>

      <div>
        <label>Extra Images:</label>
        <input type="file" accept="image/*" multiple onChange={handleExtraFiles} />
      </div>

      <button type="submit">Upload Product</button>
    </form>
  );
}