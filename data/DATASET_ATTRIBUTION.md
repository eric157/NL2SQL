# Dataset Attribution & Documentation

- **Original Source**: Global Superstore Sales Dataset (Tableau / Power BI Public Benchmark)
- **License**: Publicly Open Data License
- **Original URL**: `https://raw.githubusercontent.com/praveen-kumar-maurya/Superstore-Sales-Dashboard-Power-BI/main/Sample%20-%20Superstore.csv`
- **Dataset Size**: 9,994 transaction line items (~2.3 MB CSV)
- **Important provenance note**: The source CSV does not include returns. The `returns` table is a derived analytical estimate generated from high-discount or negative-profit line items; it is not original source data.
- **Relational Transformation**: Normalized into 3NF relational schema inside DuckDB:
  - `regions` (region_id, region_name, country)
  - `categories` (category_id, category_name, department)
  - `products` (product_id, product_name, category_id, sub_category, unit_price)
  - `customers` (customer_id, customer_name, segment, region_id, state, city, postal_code)
  - `orders` (order_id, customer_id, region_id, order_date, ship_date, ship_mode)
  - `order_items` (order_item_id, order_id, product_id, quantity, unit_price, discount, line_total, line_profit)
  - `returns` (derived estimate: return_id, order_item_id, return_date, return_reason, refund_amount)
