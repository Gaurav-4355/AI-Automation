import sqlite3

def migrate():
    conn = sqlite3.connect('novamind.db')
    cursor = conn.cursor()
    
    # Add assigned_to_id to tasks
    try:
        cursor.execute('ALTER TABLE tasks ADD COLUMN assigned_to_id INTEGER')
        print("Added assigned_to_id to tasks")
    except sqlite3.OperationalError as e:
        print(f"Tasks migration skip: {e}")

    # Add user_id to cognitive_inputs
    try:
        cursor.execute('ALTER TABLE cognitive_inputs ADD COLUMN user_id INTEGER')
        print("Added user_id to cognitive_inputs")
    except sqlite3.OperationalError as e:
        print(f"CognitiveInputs migration skip: {e}")

    # Add category and is_personal to tasks
    try:
        cursor.execute('ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT "General"')
        print("Added category to tasks")
    except sqlite3.OperationalError as e:
        print(f"Tasks migration category skip: {e}")

    try:
        cursor.execute('ALTER TABLE tasks ADD COLUMN is_personal INTEGER DEFAULT 1')
        print("Added is_personal to tasks")
    except sqlite3.OperationalError as e:
        print(f"Tasks migration is_personal skip: {e}")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
