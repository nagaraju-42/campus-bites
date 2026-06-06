-- 1. Add 'is_featured' and 'is_archived' columns to menu_items table
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Create the auto_calculate_bestsellers function
CREATE OR REPLACE FUNCTION public.auto_calculate_bestsellers(p_shop_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset all items for this shop to not featured
  UPDATE public.menu_items
  SET is_featured = false
  WHERE shop_id = p_shop_id;

  -- Find the top 5 most frequently ordered items that are not archived and set them to featured
  UPDATE public.menu_items
  SET is_featured = true
  WHERE id IN (
    SELECT oi.menu_item_id
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    JOIN public.menu_items mi ON oi.menu_item_id = mi.id
    WHERE o.shop_id = p_shop_id
      AND (mi.is_archived IS NOT TRUE)
    GROUP BY oi.menu_item_id
    ORDER BY SUM(oi.quantity) DESC
    LIMIT 5
  );
END;
$$;
