import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ProductCardModel, productsService } from "@/services/products/products.service";

export const CatalogPage = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await productsService.getProducts();
        if (isMounted) {
          setProducts(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : t("catalog.loadError"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [t]);

  if (loading) {
    return <p>{t("common.loading")}</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <section>
      <h2>{t("catalog.title")}</h2>
      {products.length === 0 ? (
        <p>{t("catalog.empty")}</p>
      ) : (
        <ul className="simple-list">
          {products.map((product) => (
            <li key={product.id} className="card">
              <strong>{product.name}</strong>
              <span>
                {product.price} {product.currency}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
