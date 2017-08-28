# Kernel

为一个目标字段定义其关联事物。

## 构造函数

| 参数 | 含义 |
| :---: | :---: |
| root | 目标对象 |
| alias | 目标字段属性名称（路径） |
| relations | 目标字段关联事物 |
| relations.resultIn | 赋值影响 |
| relations.dnstream | 关联的下游字段 |
| relations.resultFrom | 取值函数 |
| relations.upstream | 关联的上游字段 |
| relations.lazy | 是否延迟计算字段 |

### resultIn

如果定义了resultIn（赋值影响），那么在目标字段赋值时，会把root作为this，把新值作为参数，执行赋值影响。

### dnstream

如果定义了dnstream（下游字段），那么在目标字段赋值时，会对所有存在取值函数且非延迟计算的下游字段重新取值和赋值。

### resultFrom, upstream

如果定义了resultFrom取值函数，那么在目标字段取值时，会返回取值函数的执行结果；如果同时定义了upstream上游字段，那么各个上游字段的值会作为取值函数的参数。

定义了resultFrom，也需要在对应的上游字段的Kernel定义中把目标字段作为下游字段。

## 进一步解释

### 上游字段和下游字段

如果字段A在其dnstream中包含了字段B，或字段B在其upstream中包含了字段A，则A和B互为上下游字段。

### 叶子字段

如果一个字段没有下游字段，则它是一个叶子字段。

### 延迟计算字段

如果一个字段不需要实时从上游字段更新自己的值，而是只需要在取值的时候计算得出，那么对于这个字段，只需要定义其resultFrom取值函数即可。

### 响应更新字段

如果一个字段需要保持
