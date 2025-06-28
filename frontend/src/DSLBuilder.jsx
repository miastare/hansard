import React, { useState } from "react";
import useSchemaCache from "./hooks/useSchemaCache";
import deriveSchema from "./utils/DeriveSchema";
import StepCard from "./StepCard";
import SourceEditor from "./editors/SourceEditor";
import FilterEditor from "./editors/FilterEditor";
import MutateEditor from "./editors/MutateEditor/MutateEditor";
import classes from "./DSLBuilder.module.css";
import generateId from "./utils/GenerateId";

const EDITORS = { source:SourceEditor, filter:FilterEditor, mutate:MutateEditor };
const STEP_LIST = ["source","filter","mutate","aggregate","join"];

export default function DSLBuilder(){
  const [steps,setSteps]=useState([]);
  const [schema,want]=useSchemaCache();

  const patch = (i,patch)=>setSteps(p=>p.map((s,idx)=>idx===i?{...s,...patch}:s));

  const add=(op)=>setSteps(p=>[...p,{id: generateId(op),op}]);

  return (
    <div className={classes.container}>
      <h1>Build your analysis</h1>

      {steps.map((s,i)=>{
        const Editor = EDITORS[s.op];
        const cols = deriveSchema(s,steps,schema);
        return (
          <StepCard key={s.id} idx={i} step={s}
            onPatch={(p)=>patch(i,p)}
            onMove={(d)=>setSteps(p=>{
              const n=[...p]; const [x]=n.splice(i,1); n.splice(i+d,0,x); return n;})}
            onDelete={()=>setSteps(p=>p.filter((_,idx)=>idx!==i))}
            toggleReturn={()=>patch(i,{ _return:!s._return })}
            cols = {cols}
          >
            {Editor &&
              <Editor value={s}
                onChange={(v)=>patch(i,v)}
                cols={cols}
                stepIds={steps.map(st=>st.id)}
                currentIdx = {i}
              />
            }
          </StepCard>
        );
      })}

      <details className={classes.add}><summary>＋ Add step</summary>
        {STEP_LIST.map(t=><button key={t} onClick={()=>add(t)}>{t}</button>)}
      </details>
    </div>
  );
}
