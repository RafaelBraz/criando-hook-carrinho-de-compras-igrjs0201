import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // FIXME
  
  // O useEffect gerava uma alteração no cart (e consequentemente no
  // localStorage) toda vez que criava o componente, o que "bugava" o teste
  // em que era proibído executar alterações no estado "cart" e no localStorage

  // useEffect(() => {
  //   localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  // }, [cart])

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`stock/${productId}`)
      const oldProduct = cart.find(product => product.id === productId)

      if (response.data.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(oldProduct) {
        if (response.data.amount <= oldProduct.amount) {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart.map(product => {
            if (product.id === productId) {
              return {
                ...product,
                amount: product.amount + 1
              };
            }
  
            return product;
          })))

          setCart(cart.map(product => {
            if (product.id === productId) {
              return {
                ...product,
                amount: product.amount + 1
              };
            }
  
            return product;
          }))
        }
      } else {
        await api.get(`products/${productId}`)
          .then(response => {
            localStorage.setItem('@RocketShoes:cart', JSON.stringify([
              ...cart,
              {
                ...response.data,
                amount: 1
              }
            ]))

            setCart([
              ...cart,
              {
                ...response.data,
                amount: 1
              }
            ])
          });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(product => product.id === productId)) {
        throw Error()
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart.filter(product => product.id !== productId)))
      
      setCart(cart.filter(product => product.id !== productId))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get(`stock/${productId}`);
    
      if (response.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      if (amount > 0) {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount
            };
          }

          return product
        })))

        setCart(cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount
            };
          }

          return product
        }))
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
