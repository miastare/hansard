from dsl import run_pipeline

from flask import Flask, request, jsonify, abort
from flask_cors import CORS, cross_origin
from flask.helpers import send_from_directory

from dsl_supporter import dfs
from find_divisions import find_divisions_from_dsl, find_division_from_id_and_house

app = Flask(__name__)
cors = CORS(app)


@app.route('/api/run', methods=['POST'])
@cross_origin()
def run():
    return jsonify(run_pipeline(request.get_json(), app.config['DFS']))


@app.post("/api/division_by_id") 
@cross_origin()
def find_divisions_from_id_and_house_endpoint():
    data = request.get_json()
    division_id = data.get("division_id")
    house = data.get("house")
    print(f"BACKEND: divisions_from_id_and_house called with division_id={division_id}, house={house}")
    
    if division_id is None or house is None:
        print(f"BACKEND ERROR: Missing required fields - division_id={division_id}, house={house}")
        abort(400)

    # Fix the type check
    if not isinstance(division_id, (int, str)):
        print(f"BACKEND ERROR: Invalid division_id type: {type(division_id)}")
        abort(400)

    if house not in [1, 2]:
        print(f"BACKEND ERROR: Invalid house value: {house}")
        abort(400)
    
    return find_division_from_id_and_house(division_id, house)


@app.post("/api/divisions_from_dsl")
@cross_origin()
def find_divisions_from_dsl_endpoint():
    data = request.get_json()
    dsl = data.get("dsl")
    if dsl is None:
        abort(400)

    try:
        divisions, contributions = find_divisions_from_dsl(dsl)
        result = [divisions, contributions]
        print(f"BACKEND: Returning divisions count: {len(divisions)}, contributions keys: {list(contributions.keys())}")
        return jsonify(result)
    except Exception as e:
        print(f"BACKEND ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500




@app.get("/api/schema/<table>")
def schema(table: str):
    print(f"BACKEND: Schema requested for table: {table}")
    if table not in dfs:
        print(f"BACKEND: Table {table} not found in dfs")
        abort(404)
    df = dfs[table]
    schema_data = []
    for c in df.columns:
        dtype = str(df[c].dtype)
        # Simplify numeric types to just 'numeric'
        if dtype in ['int64', 'float64']:
            dtype = 'numeric'
        elif dtype == 'object':
            dtype = 'str'
        elif dtype == 'bool':
            dtype = 'bool'
        else:
            dtype = 'str'  # fallback for other types
        schema_data.append({"name": c, "dtype": dtype})
    result = {"cols": schema_data}
    print(f"BACKEND: Returning schema for {table}: {result}")
    return result


@app.get("/api/preview/<table>")
def preview(table: str):
    n = int(request.args.get("n", 5))
    if table not in dfs:
        abort(404)
    df = dfs[table].head(n)
    return df.to_dict(orient="records")


if __name__ == '__main__':
    app.config['DFS'] = dfs
    app.run(debug=True, host='0.0.0.0', port=4005)