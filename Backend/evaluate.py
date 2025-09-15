# evaluate.py
import sys
import json
import traceback

def main():
    try:
        from sentence_transformers import SentenceTransformer, util
    except Exception as e:
        print(f"__ERROR__IMPORT__ {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
    except Exception as e:
        print(f"__ERROR__MODEL_LOAD__ {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    # Accept JSON string as argv[1]
    input_json = sys.argv[1] if len(sys.argv) > 1 else '{}'
    try:
        data = json.loads(input_json)
    except Exception as e:
        print(f"__ERROR__BAD_JSON__ {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    student_answer = data.get("studentAnswer", "") or ""
    model_answer = data.get("modelAnswer", "") or ""
    max_marks = int(data.get("maxMarks", 5) or 5)

    # Quick guard
    if student_answer.strip() == "" or model_answer.strip() == "":
        print(0)
        sys.exit(0)

    try:
        emb_student = model.encode(student_answer, convert_to_tensor=True)
        emb_model = model.encode(model_answer, convert_to_tensor=True)
        similarity = util.pytorch_cos_sim(emb_student, emb_model).item()
        # ensure similarity is finite and between -1 and 1
        if similarity != similarity:  # NaN
            similarity = 0.0
        similarity = max(min(similarity, 1.0), -1.0)
        # map similarity [0,1] to [0,max_marks]. If similarity may be negative, clamp to 0.
        sim0to1 = max(similarity, 0.0)
        score = round(sim0to1 * max_marks)
        # Debug prints (to stderr) for troubleshooting if needed
        print(json.dumps({
            "similarity": float(similarity),
            "score": int(score),
        }))
        # Also print the final score as plain number on its own line (keeps backward compat)
        print(score)
        sys.exit(0)
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(0)
        sys.exit(0)

if __name__ == "__main__":
    main()
