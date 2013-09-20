<?php

namespace Hexmedia\AdministratorBundle\Twig\Node;

class ListScriptNode extends \Twig_Node
{
    /**
     * @param string $namespace
     * @param string $bundle
     * @param string $controller
     * @param int $lineNumber
     * @param string $tag
     */
    public function __construct($namespace, $bundle, $controller, $lineNumber, $tag)
    {
        return parent::__construct([], [
                'namespace' => $namespace,
                'bundle' => $bundle,
                'controller' => $controller
            ],
            $lineNumber, $tag);
    }

    /**
     * {@inheritdoc}
     */
    public function compile(\Twig_Compiler $compiler)
    {
        $compiler->write(
            'echo($this->env->getExtension(\'list_script_extension\')->get(
                \'' . $this->getAttribute('namespace') . '\',
                \'' . $this->getAttribute('bundle') . '\',
                \'' . $this->getAttribute('controller') . '\'));'
        );
    }
}