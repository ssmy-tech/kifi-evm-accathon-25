# Makefile for building the token_finder program

CXX      = g++
CXXFLAGS = -std=c++17 -Wall -Wextra
LIBS     = -lpqxx -lpq -lcurl

TARGETDIR = Build
TARGET   = token_finder
SOURCES  = token_finder.cpp keccak.cpp
OBJS     = ${patsubst %.cpp,$(TARGETDIR)/%.o,${SOURCES}} # $(SOURCES:.cpp=.o)

all: $(TARGETDIR) $(TARGETDIR)/$(TARGET)

$(TARGETDIR):
	mkdir -p $(TARGETDIR)

$(TARGETDIR)/$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -ggdb -o $(TARGETDIR)/$(TARGET) $(OBJS) $(LIBS)

$(TARGETDIR)/%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c -ggdb -O0 -g3 $< -o $@

clean:
	rm -rf $(TARGETDIR)
