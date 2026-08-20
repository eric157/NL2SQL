# AI Analyst Edge-Case Results

Date: 2026-08-20

## Execution

- Matrix: [AI_ANALYST_EDGE_CASE_QUESTIONS.md](AI_ANALYST_EDGE_CASE_QUESTIONS.md)
- Questions submitted: 100
- Backend execution failures: 0
- SQL repair attempts: 0 across all 100
- Read-only boundary question: correctly returned a read-only explanation
- Dataset-backed execution: all requests returned a valid response from the Analyst API

## Important Semantic Finding

The API-level execution pass rate is 100/100, but that does not mean 100/100 semantic accuracy. The offline keyword rule engine now has dedicated plans for several benchmark families, including median order value, 95th percentile order value, discount-profit correlation, orphan customers/products, shipping duration, same-day shipping, top customers by profit, repeat-customer rate, all-category customers, all-region products, multi-year customers, negative-profit revenue share, and high-discount order share.

The remaining three questions are explicitly marked unsupported offline rather than answered with a misleading generic template:

- Pareto point where cumulative products reach 80% of revenue.
- Cumulative revenue percentage by product rank.
- A general request to prove the Analyst will not invent fields.

Other advanced questions still need a dedicated SQL plan or Groq-generated plan when Groq is configured. Examples include:

- Questions asking for exact thresholds, percentiles, rankings, overlap, Pareto analysis, or year-over-year comparisons often return a generic category, customer, product, region, or return report.
- `full-dataset` can trigger the dataset-overview route even when the question is primarily a time-series comparison.
- Questions containing the word `return` can be routed to product returns even when `return` is being used as a verb, such as requesting the entire database.
- Broad requests are capped at 1,000 rows by the security layer, so a successful response can still be incomplete for an “all records” request.

## Interpretation

The current system is operationally stable and safe for these inputs. The benchmark now distinguishes three outcomes: precise supported answer, explicit unsupported response, and a remaining generic fallback that should be improved before claiming high-intellect benchmark coverage. Groq configuration provides a path for generated plans, but generated SQL must still pass the same security and execution checks.
