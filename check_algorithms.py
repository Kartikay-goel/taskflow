from backend.algorithms.core import insertion_sort, binary_search, insertion_sort_count, binary_search_count, linear_search_count

def run_checks():
    print("--- Running Algorithm Checks ---")
    
    # 1. Insertion Sort Empty
    lst = []
    insertion_sort(lst, "val")
    if lst == []: print("PASS: Insertion Sort Empty")
    else: print(f"FAIL: Insertion Sort Empty — expected [], got {lst}")
        
    # 2. Insertion Sort Single
    lst = [{"val": 1}]
    insertion_sort(lst, "val")
    if lst == [{"val": 1}]: print("PASS: Insertion Sort Single")
    else: print(f"FAIL: Insertion Sort Single — expected [{{'val': 1}}], got {lst}")

    # 3. Binary Search Cases
    sorted_lst = [{"val": 10}, {"val": 20}, {"val": 30}, {"val": 40}, {"val": 50}]
    
    # First index
    res = binary_search(sorted_lst, 10, "val")
    if res == 0: print("PASS: Binary Search First Index")
    else: print(f"FAIL: Binary Search First Index — expected 0, got {res}")
        
    # Last index
    res = binary_search(sorted_lst, 50, "val")
    if res == 4: print("PASS: Binary Search Last Index")
    else: print(f"FAIL: Binary Search Last Index — expected 4, got {res}")
        
    # Middle index
    res = binary_search(sorted_lst, 30, "val")
    if res == 2: print("PASS: Binary Search Middle Index")
    else: print(f"FAIL: Binary Search Middle Index — expected 2, got {res}")
        
    # Not found
    res = binary_search(sorted_lst, 99, "val")
    if res == -1: print("PASS: Binary Search Not Found")
    else: print(f"FAIL: Binary Search Not Found — expected -1, got {res}")

    # 4. Counting Wrappers
    small_list = [{"val": 3}, {"val": 1}, {"val": 2}]
    count = insertion_sort_count(small_list, "val")
    if small_list == [{"val": 1}, {"val": 2}, {"val": 3}] and type(count) == int and count > 0:
        print("PASS: Insertion Sort Count")
    else: print("FAIL: Insertion Sort Count")

    res = binary_search_count(sorted_lst, 30, "val")
    if res["index"] == 2 and type(res["comparison_count"]) == int and res["comparison_count"] > 0:
        print("PASS: Binary Search Count")
    else: print("FAIL: Binary Search Count")

    res = linear_search_count(sorted_lst, 99, "val")
    if res["index"] == -1 and res["comparison_count"] == len(sorted_lst):
        print("PASS: Linear Search Count (Not Found)")
    else: print("FAIL: Linear Search Count (Not Found)")

if __name__ == "__main__":
    run_checks()