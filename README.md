# TaskFlow - Pod Operations Platform 🚀

**🌍 Live Demo:** [https://taskflow-bay-seven.vercel.app/](https://taskflow-bay-seven.vercel.app/)

TaskFlow is a high-performance, full-stack task management platform engineered for quick-commerce operations like Blinkit dark stores. It provides pod members with a highly responsive, intuitive dashboard to manage daily inventory, logistics, and operational tasks seamlessly.

## ✨ Features
* **Authentication:** Secure user registration and login system with strict validation.
* **Workspace Isolation:** Project-based grouping ensures pod tasks remain organized and distinct.
* **Real-Time Task Board:** Instantly filter tasks by keyword, priority, completion status, or due date.
* **AI Quick-Add:** Natural language processing to instantly parse task priority and calculate exact due dates (e.g., "Restock shelves high priority tomorrow").
* **Smart Urgency Tagging:** Automatically highlights tasks due within the next 48 hours to prevent operational bottlenecks.
* **Dynamic Pagination:** Clean UI management capping views at 8 tasks per page.
* **Integrated Algorithms:** Hand-rolled sorting and search engine executing highly optimized queries.

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (Zero external UI libraries for maximum performance).
* **Backend:** Python, FastAPI, SQLAlchemy.
* **Database:** SQLite.

## 🚀 Local Setup & Installation

### 1. Clone the repository
```bash
git clone [https://github.com/Kartikay-goel/taskflow.git](https://github.com/Kartikay-goel/taskflow.git)
cd taskflow
```

### 2. Start the Backend
Navigate to the root directory, create a virtual environment, and install dependencies:
```bash
python -m venv venv
source venv/Scripts/activate  # On Windows Git Bash/Command Prompt
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. Start the Frontend
Open a new terminal, navigate to the `frontend` folder, and start a local static server:
```bash
cd frontend
python -m http.server 5500
```
Visit `http://localhost:5500` in your browser.

---

## 📡 API Endpoints List

### 1. Create Task
* **Method & Path:** `POST /tasks`
* **Request:** 
  ```json
  {
    "title": "Restock Amul Milk",
    "priority": "high",
    "due_date": "2026-08-20",
    "status": "todo",
    "project_id": 1
  }
  ```
* **Response:** (201 Created)
  ```json
  {
    "id": 1,
    "title": "Restock Amul Milk",
    "description": null,
    "priority": "high",
    "due_date": "2026-08-20",
    "status": "todo",
    "project_id": 1
  }
  ```

### 2. List Tasks
* **Method & Path:** `GET /tasks?project_id=1`
* **Response:** (200 OK)
  ```json
  [
    {
      "id": 1,
      "title": "Restock Amul Milk",
      "priority": "high",
      "due_date": "2026-08-20",
      "status": "todo",
      "project_id": 1
    }
  ]
  ```

### 3. Get Task by ID
* **Method & Path:** `GET /tasks/1`
* **Response:** (200 OK)
  ```json
  {
    "id": 1,
    "title": "Restock Amul Milk",
    "priority": "high",
    "due_date": "2026-08-20",
    "status": "todo",
    "project_id": 1
  }
  ```

### 4. Update Task
* **Method & Path:** `PUT /tasks/1`
* **Request:**
  ```json
  {
    "title": "Restock Amul Milk (Updated)",
    "priority": "medium",
    "due_date": "2026-08-22",
    "status": "in_progress"
  }
  ```
* **Response:** (200 OK)
  ```json
  {
    "id": 1,
    "title": "Restock Amul Milk (Updated)",
    "priority": "medium",
    "due_date": "2026-08-22",
    "status": "in_progress",
    "project_id": 1
  }
  ```

### 5. Delete Task
* **Method & Path:** `DELETE /tasks/1`
* **Response:** (200 OK)
  ```json
  {
    "message": "Task deleted successfully"
  }
  ```

### 6. Project Statistics
* **Method & Path:** `GET /projects/1/stats`
* **Response:** (200 OK)
  ```json
  {
    "project_id": 1,
    "project_name": "Dark Store Restock",
    "total_tasks": 15,
    "todo_count": 5,
    "in_progress_count": 5,
    "done_count": 5
  }
  ```

### 7. Sorted Task List
* **Method & Path:** `GET /tasks?sort=priority` *(or sort=due_date)*
* **Response:** (200 OK)
  ```json
  [
    {"id": 2, "title": "Critical issue", "priority": "high", "project_id": 1, "status": "todo"},
    {"id": 1, "title": "Normal task", "priority": "medium", "project_id": 1, "status": "todo"}
  ]
  ```

### 8. Search Tasks
* **Method & Path:** `GET /tasks/search?title=Critical%20issue&algo=binary`
* **Response:** (200 OK)
  ```json
  {
    "id": 2,
    "title": "Critical issue",
    "priority": "high",
    "due_date": null,
    "status": "todo",
    "project_id": 1
  }
  ```

### 9. AI Quick-Add Task
* **Method & Path:** `POST /tasks/quick-add`
* **Request:**
  ```json
  {
    "text": "Fix the freezer urgently by tomorrow",
    "project_id": 1
  }
  ```
* **Response:** (201 Created)
  ```json
  {
    "id": 3,
    "title": "Fix the freezer by",
    "priority": "high",
    "due_date": "tomorrow (2026-08-18)",
    "status": "todo",
    "project_id": 1
  }
  ```

---

## ⚙️ Algorithms Engine: Complexity & Benchmarks

### Time Complexities
* **Insertion Sort:** Best Case O(N) | Worst Case O(N^2)
* **Binary Search:** Best Case O(1) | Worst Case O(log N)
* **Linear Search:** Best Case O(1) | Worst Case O(N)

### Benchmark Results
* **10 Tasks:**
  * Insertion Sort: 24 comparisons
  * Binary Search: 4 comparisons
  * Linear Search: 10 comparisons
* **500 Tasks:**
  * Insertion Sort: 43,559 comparisons
  * Binary Search: 9 comparisons
  * Linear Search: 500 comparisons
* **3,000 Tasks:**
  * Insertion Sort: 1,535,873 comparisons
  * Binary Search: 12 comparisons
  * Linear Search: 3,000 comparisons

### Analysis: To Sort or Not to Sort?
Paying the upfront O(N^2) cost to sort the task list via `insertion_sort` is highly beneficial in this operational context. As seen in the benchmark numbers, while sorting 3,000 tasks incurs a massive initial penalty of 1,535,873 comparisons, subsequent `binary_search` queries drop to merely 12 comparisons (compared to 3,000 for a linear search). Because pod operations involve teams constantly querying, searching, and filtering their boards throughout the day while adding tasks relatively infrequently, the heavy write-time sorting cost is easily amortized over thousands of extremely fast O(log N) read operations.

---

## 🧠 AI Quick-Add Prompting Rationale

The AI prompt architecture relies strictly on a **Zero-Shot** parsing technique mapped to deterministic rules. By giving the parser explicit keyword extraction targets without providing lengthy conversational history or multi-step reasoning prompts (like Chain-of-Thought), we achieve two things: minimal token usage and near-instantaneous response times. In a fast-paced dark store environment, users need the task generated immediately; Zero-Shot provides exactly enough context to reliably extract priority and dynamically calculate future dates without over-complicating the context window or risking hallucinations.

### 5 Worked Examples (Mock Parser)

| Input Description | Exact Parsed JSON Output |
| :--- | :--- |
| "Check inventory whenever you can" | `{"title": "Check inventory you can", "priority": "low", "due_date": null}` |
| "Urgent server reboot today" | `{"title": "server reboot", "priority": "high", "due_date": "today (2026-08-17)"}` |
| "Update metrics next wednesday" | `{"title": "Update metrics", "priority": "medium", "due_date": "next wednesday (2026-08-26)"}` |
| "   " | `{"title": "Untitled task", "priority": "medium", "due_date": null}` |
| "low priority stock audit next friday asap" | `{"title": "stock audit", "priority": "high", "due_date": "next friday (2026-08-28)"}` |

---
**Author:** Kartikay Goel