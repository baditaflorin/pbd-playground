extern "C" {

__attribute__((visibility("default"))) void project_distance_constraints(
    float* positions,
    const float* inverseMasses,
    const unsigned int* aIndices,
    const unsigned int* bIndices,
    const float* restLengths,
    const float* stiffnesses,
    unsigned int count) {
  for (unsigned int c = 0; c < count; ++c) {
    const unsigned int ai = aIndices[c];
    const unsigned int bi = bIndices[c];
    const float wa = inverseMasses[ai];
    const float wb = inverseMasses[bi];
    const float weight = wa + wb;

    if (weight <= 0.000001f) {
      continue;
    }

    const unsigned int ap = ai * 3u;
    const unsigned int bp = bi * 3u;
    float dx = positions[bp] - positions[ap];
    float dy = positions[bp + 1u] - positions[ap + 1u];
    float dz = positions[bp + 2u] - positions[ap + 2u];
    const float lengthSquared = dx * dx + dy * dy + dz * dz;

    if (lengthSquared <= 0.0000001f) {
      continue;
    }

    const float length = __builtin_sqrtf(lengthSquared);
    const float correction = (length - restLengths[c]) / length;
    const float stiffness = stiffnesses[c];
    dx *= correction * stiffness;
    dy *= correction * stiffness;
    dz *= correction * stiffness;

    const float aw = wa / weight;
    const float bw = wb / weight;

    positions[ap] += dx * aw;
    positions[ap + 1u] += dy * aw;
    positions[ap + 2u] += dz * aw;

    positions[bp] -= dx * bw;
    positions[bp + 1u] -= dy * bw;
    positions[bp + 2u] -= dz * bw;
  }
}

}
