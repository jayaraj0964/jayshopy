// components/ProductList.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import ProductCard from './ProductCard';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api.getProducts(); // ← NOW EXISTS!
        setProducts(data);
      } catch (err) {
        console.error(err);
        alert('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <p>Loading products...</p>;

  return (
    <div className="product-grid">
      {products.length === 0 ? (
        <p>No products found</p>
      ) : (
        products.map(p => <ProductCard key={p.id} product={p} />)
      )}
    </div>
  );
}