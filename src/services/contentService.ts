export const contentService = {
  async home() {
    return {
      paths: [
        { id: "puzzles", label: "Solve puzzles" },
        { id: "learn", label: "Start learning" },
        { id: "practice", label: "Practice board" },
      ],
    };
  },
};
