def insertion_sort(records, key):
    """Sorts a list of dictionaries in place based on a specific key."""
    for i in range(1, len(records)):
        current_record = records[i]
        current_value = current_record[key]
        j = i - 1
        while j >= 0 and records[j][key] > current_value:
            records[j + 1] = records[j]
            j -= 1
        records[j + 1] = current_record

def binary_search(sorted_records, target_value, key):
    """Searches a sorted list of dictionaries in O(log N) time."""
    low = 0
    high = len(sorted_records) - 1
    while low <= high:
        mid = (low + high) // 2
        mid_val = sorted_records[mid][key]
        if mid_val == target_value:
            return mid
        elif mid_val < target_value:
            low = mid + 1
        else:
            high = mid - 1
    return -1

def linear_search(records, target_value, key):
    """Searches an unsorted list in O(N) time."""
    for i in range(len(records)):
        if records[i][key] == target_value:
            return i
    return -1

# --- BENCHMARKING WRAPPERS ---
def insertion_sort_count(records, key):
    comparisons = 0
    for i in range(1, len(records)):
        current_record = records[i]
        current_value = current_record[key]
        j = i - 1
        while j >= 0:
            comparisons += 1
            if records[j][key] > current_value:
                records[j + 1] = records[j]
                j -= 1
            else:
                break
        records[j + 1] = current_record
    return comparisons

def binary_search_count(sorted_records, target_value, key):
    comparisons = 0
    low = 0
    high = len(sorted_records) - 1
    while low <= high:
        comparisons += 1
        mid = (low + high) // 2
        mid_val = sorted_records[mid][key]
        if mid_val == target_value:
            return {"index": mid, "comparison_count": comparisons}
        elif mid_val < target_value:
            low = mid + 1
        else:
            high = mid - 1
    return {"index": -1, "comparison_count": comparisons}

def linear_search_count(records, target_value, key):
    comparisons = 0
    for i in range(len(records)):
        comparisons += 1
        if records[i][key] == target_value:
            return {"index": i, "comparison_count": comparisons}
    return {"index": -1, "comparison_count": comparisons}