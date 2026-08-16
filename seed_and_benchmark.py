import random
from backend.algorithms.core import insertion_sort_count, binary_search_count, linear_search_count

def generate_synthetic_data(size):
    """Generates synthetic in-memory task dictionaries for benchmarking."""
    return [{"id": i, "title": f"Task {random.randint(1, size * 10)}", "priority": random.choice([1, 2, 3])} for i in range(size)]

def run_benchmarks():
    sizes = [10, 500, 3000]
    
    print("--- Generating Benchmarks ---")
    for size in sizes:
        print(f"\nSize: {size} Tasks")
        
        # 1. Insertion Sort Benchmark
        data_for_sort = generate_synthetic_data(size)
        sort_comparisons = insertion_sort_count(data_for_sort, "priority")
        print(f"Insertion Sort: {sort_comparisons} comparisons")
        
        # 2. Search Benchmarks (using a sorted title index)
        index_data = generate_synthetic_data(size)
        # Sort index first so binary search works
        insertion_sort_count(index_data, "title") 
        
        target = index_data[-1]["title"] # Pick something at the end
        
        binary_res = binary_search_count(index_data, target, "title")
        print(f"Binary Search: {binary_res['comparison_count']} comparisons")
        
        linear_res = linear_search_count(index_data, target, "title")
        print(f"Linear Search: {linear_res['comparison_count']} comparisons")

if __name__ == "__main__":
    run_benchmarks()