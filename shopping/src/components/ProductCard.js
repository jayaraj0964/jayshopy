// // src/components/ProductCard.js
// import React from 'react';
// import { useAuth } from '../context/AuthContext';
// import { api } from '../services/api';

// function ProductCard({ product }) {
//   const { updateCartCount } = useAuth();

//   const addToCart = async () => {
//     if (product.stock <= 0) {
//       alert('This item is out of stock!');
//       return;
//     }

//     try {
//       await api.addToCart(product.id, 1);
//       alert('Added to cart!');
//       updateCartCount();
//     } catch (err) {
//       alert(err.message || 'Failed to add to cart');
//     }
//   };

//   // STOCK STATUS LOGIC
//   const getStockInfo = () => {
//     if (product.stock === 0) {
//       return { text: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-100', disabled: true };
//     } else if (product.stock <= 5) {
//       return { text: `Only ${product.stock} left!`, color: 'text-orange-600', bg: 'bg-orange-100', disabled: false };
//     } else {
//       return { text: 'In Stock', color: 'text-green-600', bg: 'bg-green-100', disabled: false };
//     }
//   };

//   const stock = getStockInfo();

//   return (
//     <div className="product-card border rounded-lg p-4 shadow hover:shadow-xl transition-all duration-300 bg-white">
//       {/* IMAGE */}
//       {product.productImageBase64 ? (
//         <img
//           src={product.productImageBase64}
//           alt={product.name}
//           className="w-full h-48 object-cover rounded-md mb-3"
//         />
//       ) : (
//         <div className="bg-gray-200 border-2 border-dashed rounded-md w-full h-48 flex items-center justify-center text-gray-500 mb-3">
//           No Image
//         </div>
//       )}

//       {/* NAME & PRICE */}
//       <h3 className="font-bold text-lg text-gray-800 line-clamp-2">{product.name}</h3>
//       <p className="text-xl font-bold text-green-600 mt-1">₹{product.price}</p>

//       {/* STOCK BADGE */}
//       <div className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold inline-block ${stock.bg} ${stock.color}`}>
//         {stock.text}
//       </div>

//       {/* ADD TO CART BUTTON */}
//       <button
//         onClick={addToCart}
//         disabled={stock.disabled}
//         className={`mt-3 w-full py-2.5 rounded-lg font-medium transition-all duration-200 text-sm
//           ${stock.disabled
//             ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
//             : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
//           }`}
//       >
//         {stock.disabled ? 'Out of Stock' : 'Add to Cart'}
//       </button>
//     </div>
//   );
// }

// export default ProductCard;