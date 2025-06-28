from dsl import run_pipeline

from flask import Flask, request, jsonify, abort
from flask_cors import CORS, cross_origin
from flask.helpers import send_from_directory

from dsl_supporter import dfs


app = Flask(__name__, static_folder='./frontend/build', static_url_path='')
cors = CORS(app)

@app.route('/api/run', methods=['POST'])
@cross_origin()
def run():
    return jsonify(run_pipeline(request.get_json(), app.config['DFS']))


@app.route('/')
@cross_origin()
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.get("/api/schema/<table>")
def schema(table: str):
    print(f"BACKEND: Schema requested for table: {table}")
    if table not in dfs:
        print(f"BACKEND: Table {table} not found in dfs")
        abort(404)
    df = dfs[table]
    schema_data = [{"name": c, "dtype": str(df[c].dtype)} for c in df.columns]
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
    app.run(debug=False, host='0.0.0.0', port=4005)

