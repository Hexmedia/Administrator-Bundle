<?php

namespace Hexmedia\AdministratorBundle\Templating\Helper;

use Hexmedia\AdministratorBundle\ViewModel\Ga;
use Symfony\Component\Templating\EngineInterface;
use Symfony\Component\Templating\Helper\Helper;

class GaHelper extends Helper
{

    /**
     * @var \Symfony\Component\Templating\EngineInterface
     */
    private $templating;
    /**
     * @var \Hexmedia\AdministratorBundle\ViewModel\Ga
     */
    private $ga;
    /**
     * @var array
     */
    private $options;

    /**
     * Returns the canonical name of this helper.
     *
     * @return string The canonical name
     *
     * @api
     */
    public function getName()
    {
        return "hexmedia.ga.helper";
    }

    public function __construct(EngineInterface $templating, Ga $ga, array $options)
    {
        $this->templating = $templating;
        $this->ga = $ga;
        $this->options = $options;

    }

    public function render($options)
    {
        $this->resolveOptions($options);

        return $this->templating->render(
            $this->options['viewTemplate'],
            $this->options
        );
    }

    /**
     * Merges user-supplied options from the view
     * with base config values
     *
     * @param array $options
     * @return array
     */
    private function resolveOptions(array $options = array())
    {
        $this->options["ga"] = $this->ga;

        if (!$this->ga->getCode() && isset($options['code'])) {
            $this->ga->setCode($options['code']);
        } else if (!$this->ga->getDomain() && isset($options['domain'])) {
            $this->ga->setDomain($options['domain']);
        }

        return array_merge($this->options, $options);
    }

}